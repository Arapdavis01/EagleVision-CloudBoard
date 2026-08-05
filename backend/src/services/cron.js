const cron = require('node-cron');
const pool = require('../config/db');
const axios = require('axios');

async function pingAllProjects() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT id, live_url FROM projects WHERE live_url IS NOT NULL AND status = $1', ['active']);
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      await Promise.all(batch.map(async (project) => {
        const start = Date.now();
        let statusCode = null, isUp = false;
        try {
          const res = await axios.get(project.live_url, { timeout: 10000, validateStatus: () => true });
          statusCode = res.status;
          isUp = statusCode >= 200 && statusCode < 400;
        } catch {}
        const responseTime = Date.now() - start;
        await client.query('INSERT INTO uptime_logs (project_id, status_code, response_time_ms, is_up) VALUES ($1,$2,$3,$4)', [project.id, statusCode, responseTime, isUp]);
      }));
    }
  } catch (err) { console.error(err); } finally { client.release(); }
}

function startCron() {
  cron.schedule('*/5 * * * *', pingAllProjects);
}

module.exports = { startCron };
