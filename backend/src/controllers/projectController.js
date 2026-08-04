const pool = require('../config/db');
const redis = require('../config/redis');

exports.getAll = async (req, res) => {
  try {
    const { location, status } = req.query;
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
    const status = await redis.hgetall(`project:${id}:status`);
    project.liveStatus = status || null;
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

exports.create = async (req, res) => {
  const { name, description, client_name, location, live_url, github_repo, hosting_platform } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO projects (name, description, client_name, location, live_url, github_repo, hosting_platform)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, description, client_name, location, live_url, github_repo, hosting_platform]
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
  const setClauses = [];
  const values = [];
  let idx = 1;
  for (let key in updates) {
    setClauses.push(`${key} = $${idx}`);
    values.push(updates[key]);
    idx++;
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
