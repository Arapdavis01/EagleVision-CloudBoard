const pool = require('../config/db');

// ==================== SERVICE PLANS CRUD ====================

// Get all service plans (with optional filters and sorting)
exports.getAll = async (req, res) => {
  const { project_id, status, priority, search, sort } = req.query;
  
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
  
  // Sorting options
  switch (sort) {
    case 'date-asc':
      query += ` ORDER BY sp.target_date ASC NULLS LAST, sp.created_at DESC`;
      break;
    case 'date-desc':
      query += ` ORDER BY sp.target_date DESC NULLS LAST, sp.created_at DESC`;
      break;
    case 'cost-asc':
      query += ` ORDER BY sp.estimated_cost ASC NULLS LAST`;
      break;
    case 'cost-desc':
      query += ` ORDER BY sp.estimated_cost DESC NULLS LAST`;
      break;
    case 'created-desc':
      query += ` ORDER BY sp.created_at DESC`;
      break;
    case 'created-asc':
      query += ` ORDER BY sp.created_at ASC`;
      break;
    default:
      query += ` ORDER BY 
        CASE sp.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
        sp.target_date ASC NULLS LAST,
        sp.created_at DESC`;
  }
  
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
    estimated_cost, target_date, notes, template_id
  } = req.body;

  if (!project_id || !title || !category) {
    return res.status(400).json({ error: 'Project, title, and category are required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO service_plans 
       (project_id, title, description, category, priority, estimated_cost, target_date, notes, template_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [project_id, title, description || null, category, priority || 'medium',
       estimated_cost || 0, target_date || null, notes || null, template_id || null]
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
    estimated_cost, target_date, notes, status, progress
  } = req.body;

  if (!title || !category) {
    return res.status(400).json({ error: 'Title and category are required' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE service_plans SET
       project_id = $1, title = $2, description = $3, category = $4,
       priority = $5, estimated_cost = $6, target_date = $7, notes = $8,
       status = COALESCE($9, status), 
       progress = COALESCE($10, progress),
       updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [project_id, title, description || null, category, priority || 'medium',
       estimated_cost || 0, target_date || null, notes || null, 
       status || null, progress !== undefined ? progress : null, id]
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
    
    // 4. Update plan with service record link, status, and progress
    const { rows: updatedPlanRows } = await client.query(
      `UPDATE service_plans SET
       status = 'in_progress',
       update_id = $1,
       progress = 50,
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
       progress = 100,
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
       progress = 0,
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
       progress = 0,
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

// ==================== ENHANCED STATS ====================

// Get stats for service planner with trends
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
        COUNT(*) FILTER (WHERE target_date < CURRENT_DATE AND status = 'planned') as overdue,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_this_week,
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_date >= NOW() - INTERVAL '30 days') as completed_this_month,
        COALESCE(SUM(estimated_cost) FILTER (WHERE status != 'cancelled'), 0) as total_estimated_cost,
        COALESCE(SUM(estimated_cost) FILTER (WHERE status = 'completed'), 0) as completed_cost
      FROM service_plans
    `);
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to fetch service plan stats:', err);
    res.status(500).json({ error: 'Failed to fetch service plan stats' });
  }
};

// ==================== TEMPLATES ====================

// Get all plan templates
exports.getTemplates = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM plan_templates ORDER BY name ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch templates:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

// Get single template
exports.getTemplate = async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rows } = await pool.query(
      'SELECT * FROM plan_templates WHERE id = $1',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to fetch template:', err);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
};

// Create plan from template
exports.createFromTemplate = async (req, res) => {
  const { templateId } = req.params;
  const { project_id, target_date } = req.body;

  if (!project_id) {
    return res.status(400).json({ error: 'Project is required' });
  }

  try {
    // Get template
    const { rows: templateRows } = await pool.query(
      'SELECT * FROM plan_templates WHERE id = $1',
      [templateId]
    );

    if (templateRows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateRows[0];

    // Create plan from template
    const { rows } = await pool.query(
      `INSERT INTO service_plans 
       (project_id, title, description, category, priority, estimated_cost, target_date, template_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [project_id, template.name, template.description, template.category,
       template.priority, template.estimated_cost, target_date || null, templateId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Failed to create plan from template:', err);
    res.status(500).json({ error: 'Failed to create plan from template' });
  }
};

// Create new template
exports.createTemplate = async (req, res) => {
  const { name, category, description, estimated_cost, priority } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO plan_templates (name, category, description, estimated_cost, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, category, description || null, estimated_cost || 0, priority || 'medium']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Failed to create template:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
};

// Delete template
exports.deleteTemplate = async (req, res) => {
  const { id } = req.params;
  
  try {
    const { rowCount } = await pool.query('DELETE FROM plan_templates WHERE id = $1', [id]);
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ message: 'Template deleted' });
  } catch (err) {
    console.error('Failed to delete template:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
};

// ==================== BULK ACTIONS ====================

// Bulk update status
exports.bulkUpdateStatus = async (req, res) => {
  const { planIds, status } = req.body;

  if (!planIds || !Array.isArray(planIds) || planIds.length === 0) {
    return res.status(400).json({ error: 'Plan IDs are required' });
  }

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['planned', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const progressValue = status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0;
    const completedDate = status === 'completed' ? 'NOW()' : 'NULL';

    const { rows } = await pool.query(
      `UPDATE service_plans SET
       status = $1,
       progress = $2,
       completed_date = ${completedDate},
       updated_at = NOW()
       WHERE id = ANY($3::int[])
       RETURNING *`,
      [status, progressValue, planIds]
    );

    res.json({ 
      message: `${rows.length} plans updated to ${status}`,
      updated: rows 
    });
  } catch (err) {
    console.error('Failed to bulk update plans:', err);
    res.status(500).json({ error: 'Failed to bulk update plans' });
  }
};

// Bulk delete
exports.bulkDelete = async (req, res) => {
  const { planIds } = req.body;

  if (!planIds || !Array.isArray(planIds) || planIds.length === 0) {
    return res.status(400).json({ error: 'Plan IDs are required' });
  }

  try {
    const { rowCount } = await pool.query(
      'DELETE FROM service_plans WHERE id = ANY($1::int[])',
      [planIds]
    );

    res.json({ 
      message: `${rowCount} plans deleted`,
      deleted: rowCount 
    });
  } catch (err) {
    console.error('Failed to bulk delete plans:', err);
    res.status(500).json({ error: 'Failed to bulk delete plans' });
  }
};

// Bulk update priority
exports.bulkUpdatePriority = async (req, res) => {
  const { planIds, priority } = req.body;

  if (!planIds || !Array.isArray(planIds) || planIds.length === 0) {
    return res.status(400).json({ error: 'Plan IDs are required' });
  }

  const validPriorities = ['high', 'medium', 'low'];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE service_plans SET
       priority = $1,
       updated_at = NOW()
       WHERE id = ANY($2::int[])
       RETURNING *`,
      [priority, planIds]
    );

    res.json({ 
      message: `${rows.length} plans updated`,
      updated: rows 
    });
  } catch (err) {
    console.error('Failed to bulk update priority:', err);
    res.status(500).json({ error: 'Failed to bulk update priority' });
  }
};

// ==================== CALENDAR VIEW ====================

// Get plans grouped by date for calendar view
exports.getCalendarData = async (req, res) => {
  const { month, year, project_id } = req.query;

  try {
    let query = `
      SELECT sp.id, sp.title, sp.status, sp.priority, sp.target_date, sp.estimated_cost,
             p.name as project_name
      FROM service_plans sp
      LEFT JOIN projects p ON sp.project_id = p.id
      WHERE sp.target_date IS NOT NULL
    `;

    const params = [];

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
      params.push(startDate, endDate);
      query += ` AND sp.target_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    if (project_id) {
      params.push(project_id);
      query += ` AND sp.project_id = $${params.length}`;
    }

    query += ` ORDER BY sp.target_date ASC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch calendar data:', err);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
};
