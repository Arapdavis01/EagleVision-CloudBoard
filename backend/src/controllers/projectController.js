const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { location, status, tag, search } = req.query;
    let query = 'SELECT * FROM projects';
    const params = [];
    const conditions = [];

    if (location) {
      params.push(location);
      conditions.push(`location = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (tag) {
      params.push(tag);
      conditions.push(`$${params.length} = ANY(tags)`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR client_name ILIKE $${params.length})`);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY name';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    const project = rows[0];

    // Latest uptime log
    const statusRows = await pool.query(
      `SELECT status_code, response_time_ms, is_up, checked_at
       FROM uptime_logs
       WHERE project_id = $1
       ORDER BY checked_at DESC
       LIMIT 1`,
      [id]
    );

    project.liveStatus = statusRows.rows[0]
      ? {
          status: statusRows.rows[0].is_up ? 'up' : 'down',
          latency: statusRows.rows[0].response_time_ms,
          status_code: statusRows.rows[0].status_code,
          checked_at: statusRows.rows[0].checked_at,
        }
      : null;

    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

exports.create = async (req, res) => {
  const {
    name,
    description,
    client_name,
    location,
    live_url,
    github_repo,
    hosting_platform,
    tech_stack,
    tags,
    last_updated,
    next_review_date,
    thumbnail_url,
    status,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO projects
       (name, description, client_name, location, live_url, github_repo, hosting_platform,
        tech_stack, tags, last_updated, next_review_date, thumbnail_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        name,
        description,
        client_name,
        location,
        live_url,
        github_repo,
        hosting_platform,
        tech_stack || {},
        tags || [],
        last_updated,
        next_review_date,
        thumbnail_url,
        status || 'live',
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Project creation failed' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Do not allow updating the ID or read‑only fields
  delete updates.id;
  delete updates.created_at;
  delete updates.updated_at;
  delete updates.liveStatus;   // this is computed, not stored

  const setClauses = [];
  const values = [];
  let idx = 1;

  for (let key in updates) {
    setClauses.push(`${key} = $${idx}`);
    values.push(updates[key]);
    idx++;
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);

  try {
    const query = `UPDATE projects SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
};

exports.delete = async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
};

// ---------- PUBLIC STATUS PAGE (no auth) ----------
exports.publicStatus = async (req, res) => {
  try {
    const { token } = req.params;

    const { rows: projectRows } = await pool.query(
      'SELECT id, name, client_name, live_url, thumbnail_url, status, tech_stack FROM projects WHERE public_token = $1',
      [token]
    );

    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectRows[0];

    const { rows: statusRows } = await pool.query(
      `SELECT status_code, response_time_ms, is_up, checked_at
       FROM uptime_logs
       WHERE project_id = $1
       ORDER BY checked_at DESC
       LIMIT 1`,
      [project.id]
    );

    project.liveStatus = statusRows[0]
      ? {
          status: statusRows[0].is_up ? 'up' : 'down',
          latency: statusRows[0].response_time_ms,
          checked_at: statusRows[0].checked_at,
        }
      : null;

    // Remove internal ID for security
    delete project.id;
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch public status' });
  }
};
