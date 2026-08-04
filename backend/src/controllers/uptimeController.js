const redis = require('../config/redis');
const pool = require('../config/db');

exports.getStatuses = async (req, res) => {
  try {
    const keys = await redis.keys('project:*:status');
    const multi = redis.multi();
    keys.forEach(key => multi.hgetall(key));
    const results = await multi.exec();
    const statuses = results.map(([err, data]) => {
      if (err) return null;
      return data;
    }).filter(Boolean);
    res.json(statuses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get statuses' });
  }
};

exports.getHistory = async (req, res) => {
  const { projectId } = req.params;
  const { range = '24h' } = req.query;
  try {
    let since;
    if (range === '24h') since = '24 hours';
    else if (range === '7d') since = '7 days';
    else if (range === '30d') since = '30 days';
    else since = '24 hours';
    const { rows } = await pool.query(
      `SELECT checked_at, response_time_ms, is_up FROM uptime_logs
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
