const { Queue } = require('bullmq');
const redis = require('../config/redis');

const pingQueue = new Queue('ping-queue', { connection: redis });

async function addAllProjectsToQueue(pool) {
  const { rows } = await pool.query('SELECT id, live_url FROM projects WHERE live_url IS NOT NULL');
  const jobs = rows.map(project => ({
    name: `ping-${project.id}`,
    data: { projectId: project.id, url: project.live_url },
    opts: { removeOnComplete: true, removeOnFail: 100 },
  }));
  await pingQueue.addBulk(jobs);
}

module.exports = { pingQueue, addAllProjectsToQueue };
