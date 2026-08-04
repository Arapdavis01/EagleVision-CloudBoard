exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    const project = rows[0];

    // Get latest uptime log for this project
    const statusRows = await pool.query(
      `SELECT status_code, response_time_ms, is_up, checked_at
       FROM uptime_logs
       WHERE project_id = $1
       ORDER BY checked_at DESC
       LIMIT 1`,
      [id]
    );
    if (statusRows.rows.length > 0) {
      const s = statusRows.rows[0];
      project.liveStatus = {
        status: s.is_up ? 'up' : 'down',
        latency: s.response_time_ms,
        status_code: s.status_code,
        checked_at: s.checked_at,
      };
    } else {
      project.liveStatus = null;
    }
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};
