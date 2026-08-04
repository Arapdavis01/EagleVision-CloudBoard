const cron = require('node-cron');
const pool = require('../config/db');
const axios = require('axios');

async function pingAllProjects() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT id, live_url FROM projects WHERE live_url IS NOT NULL AND status = $1', ['active']);
    console.log(`Pinging ${rows.length} projects...`);

    // Process in chunks of 50 to avoid overwhelming the network
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const pingPromises = chunk.map(async (project) => {
        const start = Date.now();
        let statusCode = null;
        let isUp = false;
        try {
          const res = await axios.get(project.live_url, { timeout: 10000, validateStatus: () => true });
          statusCode = res.status;
          isUp = statusCode >= 200 && statusCode < 400;
        } catch (err) {
          isUp = false;
        }
        const responseTime = Date.now() - start;

        // Save directly to uptime_logs
        await client.query(
          `INSERT INTO uptime_logs (project_id, status_code, response_time_ms, is_up) VALUES ($1, $2, $3, $4)`,
          [project.id, statusCode, responseTime, isUp]
        );
      });
      await Promise.all(pingPromises);
    }
  } catch (err) {
    console.error('Ping error:', err);
  } finally {
    client.release();
  }
}

function startCron() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', pingAllProjects);
  console.log('Cron job scheduled');
}

module.exports = { startCron };
