const pool = require('../config/db');

exports.getAll = async (req, res) => {
  const { search } = req.query;
  let query = `SELECT * FROM projects`;
  const params = [];
  if (search) {
    query += ` WHERE name ILIKE $1 OR client ILIKE $1 OR tags ILIKE $1`;
    params.push(`%${search}%`);
  }
  query += ` ORDER BY created_at DESC`;
  const { rows } = await pool.query(query, params);
  res.json(rows);
};

exports.getOne = async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });
  res.json(rows[0]);
};

exports.create = async (req, res) => {
  const {
    name, client, live_url, github, hosting, location, description,
    tech_stack, tags, next_review_date, thumbnail_url, status,
    project_type, domain_name, registrar, expiry_date, auto_renew,
    for_sale, asking_price
  } = req.body;

  const isForSale = for_sale === true || for_sale === 'true';
  const askingPrice = asking_price ? parseFloat(asking_price) : null;
  const autoRenew = auto_renew === true || auto_renew === 'true';

  const { rows } = await pool.query(
    `INSERT INTO projects
     (name, client, live_url, github, hosting, location, description, tech_stack, tags,
      next_review_date, thumbnail_url, status, project_type, domain_name, registrar, expiry_date,
      auto_renew, for_sale, asking_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     RETURNING *`,
    [name, client, live_url, github, hosting, location, description,
     JSON.stringify(tech_stack || []), tags || '', next_review_date, thumbnail_url,
     status || 'Planning', project_type || 'Other', domain_name || null, registrar || null,
     expiry_date || null, autoRenew, isForSale, askingPrice]
  );
  res.status(201).json(rows[0]);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const {
    name, client, live_url, github, hosting, location, description,
    tech_stack, tags, next_review_date, thumbnail_url, status,
    project_type, domain_name, registrar, expiry_date, auto_renew,
    for_sale, asking_price
  } = req.body;

  const isForSale = for_sale === true || for_sale === 'true';
  const askingPrice = asking_price ? parseFloat(asking_price) : null;
  const autoRenew = auto_renew === true || auto_renew === 'true';

  const { rows } = await pool.query(
    `UPDATE projects SET
     name = $1, client = $2, live_url = $3, github = $4, hosting = $5, location = $6,
     description = $7, tech_stack = $8, tags = $9, next_review_date = $10,
     thumbnail_url = $11, status = $12, last_updated = NOW(),
     project_type = $13, domain_name = $14, registrar = $15, expiry_date = $16,
     auto_renew = $17, for_sale = $18, asking_price = $19
     WHERE id = $20 RETURNING *`,
    [name, client, live_url, github, hosting, location, description,
     JSON.stringify(tech_stack || []), tags || '', next_review_date, thumbnail_url,
     status, project_type || 'Other', domain_name || null, registrar || null,
     expiry_date || null, autoRenew, isForSale, askingPrice, id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });
  res.json(rows[0]);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Project not found' });
  res.json({ message: 'Project deleted' });
};

// For public status page
exports.getPublicStatus = async (req, res) => {
  const { token } = req.params;
  const { rows } = await pool.query('SELECT * FROM projects WHERE public_token = $1', [token]);
  if (rows.length === 0) return res.status(404).json({ error: 'Invalid token' });
  const project = rows[0];
  // Optionally include latest uptime log
  const { rows: logs } = await pool.query(
    'SELECT * FROM uptime_logs WHERE project_id = $1 ORDER BY checked_at DESC LIMIT 1',
    [project.id]
  );
  res.json({ project, latest_uptime: logs[0] || null });
};

// ==================== PROJECT UPDATES (SERVICE RECORD) ====================

// Get all updates for a specific project (with plan info if linked)
exports.getProjectUpdates = async (req, res) => {
  const { projectId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT pu.*, 
              sp.id as plan_id, 
              sp.title as plan_title, 
              sp.status as plan_status,
              sp.priority as plan_priority
       FROM project_updates pu
       LEFT JOIN service_plans sp ON sp.update_id = pu.id
       WHERE pu.project_id = $1
       ORDER BY pu.created_at DESC`,
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project updates' });
  }
};

// Create a new update for a project
exports.createProjectUpdate = async (req, res) => {
  const { projectId } = req.params;
  const { update_type, title, description, cost } = req.body;

  if (!title || !update_type) {
    return res.status(400).json({ error: 'Update type and title are required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO project_updates (project_id, update_type, title, description, cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [projectId, update_type, title, description || null, cost || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create project update' });
  }
};

// Update an existing project update entry
exports.updateProjectUpdate = async (req, res) => {
  const { id } = req.params;
  const { update_type, title, description, cost } = req.body;

  if (!title || !update_type) {
    return res.status(400).json({ error: 'Update type and title are required' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE project_updates SET
       update_type = $1, title = $2, description = $3, cost = $4
       WHERE id = $5
       RETURNING *`,
      [update_type, title, description || null, cost || null, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Update not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update project update' });
  }
};

// Delete a project update entry
exports.deleteProjectUpdate = async (req, res) => {
  const { id } = req.params;
  try {
    // First, unlink any service plans that reference this update
    await pool.query('UPDATE service_plans SET update_id = NULL WHERE update_id = $1', [id]);
    
    // Then delete the update
    const { rowCount } = await pool.query('DELETE FROM project_updates WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Update not found' });
    res.json({ message: 'Update deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete project update' });
  }
};

// ==================== REVIEW & UPDATE (COMBINED ACTION) ====================

// Create a project update AND update the project's next_review_date/status
exports.reviewAndUpdate = async (req, res) => {
  const { projectId } = req.params;
  const { update_type, title, description, cost, next_review_date, status } = req.body;

  if (!title || !update_type) {
    return res.status(400).json({ error: 'Update type and title are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert new project update
    const { rows: updateRows } = await client.query(
      `INSERT INTO project_updates (project_id, update_type, title, description, cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [projectId, update_type, title, description || null, cost || null]
    );

    // 2. Update project next_review_date and status (if provided)
    await client.query(
      `UPDATE projects
       SET next_review_date = $1,
           status = COALESCE($2, status),
           last_updated = NOW()
       WHERE id = $3`,
      [next_review_date || null, status || null, projectId]
    );

    await client.query('COMMIT');
    res.status(201).json(updateRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to complete review & update' });
  } finally {
    client.release();
  }
};
