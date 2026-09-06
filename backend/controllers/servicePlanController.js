const pool = require('../config/db');

// ==================== SERVICE PLANS CRUD ====================

// Get all service plans (with optional filters)
exports.getAll = async (req, res) => {
  const { project_id, status, priority, search } = req.query;
  
  let query = `
    SELECT sp.*, p.name as project_name, p.client as project_client,
           pu.title as linked_update_title
    FROM service_plans sp
    LEFT JOIN projects p ON sp.project_id = p.id
    LEFT JOIN project_updates pu ON sp.update_id = pu.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (project_id) {
    params.push(project_id);
    query += ` AND sp.project_id = $${params.length}`;
  }
  
  if (status && status !== 'all') {
    params.push(status);
    query += ` AND sp.status = $${params.length}`;
  }
  
  if (priority && priority !== 'all') {
    params.push(priority);
    query += ` AND sp.priority = $${params.length}`;
  }
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (sp.title ILIKE $${params.length} OR sp.description ILIKE $${params.length})`;
  }
  
  query += ` ORDER BY 
    CASE sp.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
    sp.target_date ASC NULLS LAST,
    sp.created_at DESC`;
  
  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch service plans:', err);
    res.status(500).json({ error: 'Failed to fetch service plans' });
  }
};

// Get single service plan
exports.getOne = async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      `SELECT sp.*, p.name as project_name, p.client as project_client,
              pu.title as linked_update_title, pu.update_type as linked_update_type
       FROM service_plans sp
       LEFT JOIN projects p ON sp.project_id = p.id
       LEFT JOIN project_updates pu ON sp.update_id = pu.id
       WHERE sp.id = $1`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service plan not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to fetch service plan:', err);
    res.status(500).json({ error: 'Failed to fetch service plan' });
  }
};

// Create new service plan
exports.create = async (req, res) => {
  const {
    project_id, title, description, category, priority,
    estimated_cost, target_date, notes
  } = req.body;

  if (!project_id || !title || !category) {
    return res.status(400).json({ error: 'Project, title, and category are required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO service_plans 
       (project_id, title, description, category, priority, estimated_cost, target_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [project_id, title, description || null, category, priority || 'medium',
       estimated_cost || 0, target_date || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Failed to create service plan:', err);
    res.status(500).json({ error: 'Failed to create service plan' });
  }
};

// Update service plan
exports.update = async (req, res) => {
  const { id } = req.params;
  const {
    project_id, title, description, category, priority,
    estimated_cost, target_date, notes, status
  } = req.body;

  if (!title || !category) {
    return res.status(400).json({ error: 'Title and category are required' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE service_plans SET
       project_id = $1, title = $2, description = $3, category = $4,
       priority = $5, estimated_cost = $6, target_date = $7, notes = $8,
       status = COALESCE($9, status), updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [project_id, title, description || null, category, priority || 'medium',
       estimated_cost || 0, target_date || null, notes || null, status || null, id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service plan not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to update service plan:', err);
    res.status(500).json({ error: 'Failed to update service plan' });
  }
};

// Delete service plan
exports.remove = async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rowCount } = await pool.query('DELETE FROM service_plans WHERE id = $1', [id]);
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Service plan not found' });
    }
    
    res.json({ message: 'Service plan deleted' });
  } catch (err) {
    console.error('Failed to delete service plan:', err);
    res.status(500).json({ error: 'Failed to delete service plan' });
  }
};

// ==================== APPROVE PLAN (CREATE SERVICE RECORD) ====================

// Approve plan and create service record
exports.approvePlan = async (req, res) => {
  const { id } = req.params;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Get the plan
    const { rows: planRows } = await client.query(
      'SELECT * FROM service_plans WHERE id = $1',
      [id]
    );
    
    if (planRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Service plan not found' });
    }
    
    const plan = planRows[0];
    
    // 2. Validate plan status
    if (plan.status !== 'planned') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Plan is already ${plan.status}` });
    }
    
    // 3. Create service record (project_update)
    const { rows: updateRows } = await client.query(
      `INSERT INTO project_updates (project_id, update_type, title, description, cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [plan.project_id, plan.category, plan.title, plan.description || '', plan.estimated_cost || 0]
    );
    
    const serviceRecord = updateRows[0];
    
    // 4. Update plan with service record link and status
    const { rows: updatedPlanRows } = await client.query(
      `UPDATE service_plans SET
       status = 'in_progress',
       update_id = $1,
       updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [serviceRecord.id, id]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Service record created successfully',
      plan: updatedPlanRows[0],
      service_record: serviceRecord
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to approve service plan:', err);
    res.status(500).json({ error: 'Failed to approve service plan' });
  } finally {
    client.release();
  }
};

// Mark plan as completed
exports.completePlan = async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      `UPDATE service_plans SET
       status = 'completed',
       completed_date = NOW(),
       updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service plan not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to complete service plan:', err);
    res.status(500).json({ error: 'Failed to complete service plan' });
  }
};

// Reopen plan (set back to planned)
exports.reopenPlan = async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      `UPDATE service_plans SET
       status = 'planned',
       completed_date = NULL,
       updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service plan not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to reopen service plan:', err);
    res.status(500).json({ error: 'Failed to reopen service plan' });
  }
};

// Cancel plan
exports.cancelPlan = async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      `UPDATE service_plans SET
       status = 'cancelled',
       updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service plan not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to cancel service plan:', err);
    res.status(500).json({ error: 'Failed to cancel service plan' });
  }
};

// Get stats for service planner
exports.getStats = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_plans,
        COUNT(*) FILTER (WHERE status = 'planned') as planned,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE priority = 'high' AND status != 'completed') as high_priority,
        COUNT(*) FILTER (WHERE target_date < CURRENT_DATE AND status = 'planned') as overdue
      FROM service_plans
    `);
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to fetch service plan stats:', err);
    res.status(500).json({ error: 'Failed to fetch service plan stats' });
  }
};
