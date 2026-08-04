const { Worker } = require('bullmq');
const axios = require('axios');
const redis = require('../config/redis');
const pool = require('../config/db');
const { batchInsert } = require('../utils/batchInsert');

const worker = new Worker('ping-queue', async job => {
  const { projectId, url } = job.data;
  const start = Date.now();
  let statusCode = null;
  let isUp = false;
  try {
    const response = await axios.get(url, { timeout: 10000, validateStatus: () => true });
    statusCode = response.status;
    isUp = statusCode >= 200 && statusCode < 400;
  } catch (err) {
    isUp = false;
  }
  const responseTime = Date.now() - start;

  // Update Redis cache
  await redis.hset(`project:${projectId}:status`, {
    project_id: projectId,
    status: isUp ? 'up' : 'down',
    latency: responseTime,
    status_code: statusCode,
    checked_at: new Date().toISOString(),
  });

  // Insert into batch table for later bulk insert
  await pool.query(
    `INSERT INTO uptime_logs (project_id, status_code, response_time_ms, is_up) VALUES ($1, $2, $3, $4)`,
    [projectId, statusCode, responseTime, isUp]
  );
}, { concurrency: 50, connection: redis });

worker.on('completed', job => console.log(`Pinged project ${job.data.projectId}`));
worker.on('failed', (job, err) => console.error(`Ping failed for ${job.data.projectId}:`, err));

module.exports = worker;
