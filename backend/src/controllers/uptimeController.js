const pool = require('../config/db');

// Get the latest status for every project (most recent log per project)
exports.getStatuses = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT ON (project_id)
        project_id,
        status_code,
        response_time_ms,
        is_up,
        checked_at
      FROM uptime_logs
      ORDER BY project_id, checked_at DESC
    `;
    const { rows } = await pool.query(query);
    const statuses = rows.map(r => ({
      project_id: r.project_id,
      status: r.is_up ? 'up' : 'down',
      latency: r.response_time_ms,
      status_code: r.status_code,
      checked_at: r.checked_at,
    }));
    res.json(statuses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get statuses' });
  }
};

// History endpoint unchanged
exports.getHistory = async (req, res) => {
  const { projectId } = req.params;
  const { range = '24h' } = req.query;
  let since;
  if (range === '24h') since = '24 hours';
  else if (range === '7d') since = '7 days';
  else if (range === '30d') since = '30 days';
  else since = '24 hours';

  try {
    const { rows } = await pool.query(
      `SELECT checked_at, response_time_ms, is_up
       FROM uptime_logs
       WHERE project_id = $1 AND checked_at > NOW() - INTERVAL '${since}'
       ORDER BY checked_at ASC`,
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};
