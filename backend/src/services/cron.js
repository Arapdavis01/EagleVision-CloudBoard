const cron = require('node-cron');
const pool = require('../config/db');
const { addAllProjectsToQueue } = require('./queueService');

function startCron() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('Cron: Adding all projects to queue');
    try {
      await addAllProjectsToQueue(pool);
    } catch (err) {
      console.error('Cron error:', err);
    }
  });
}

module.exports = startCron;
