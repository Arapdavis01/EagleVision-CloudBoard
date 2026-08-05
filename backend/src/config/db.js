const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // No ssl option needed – NODE_TLS_REJECT_UNAUTHORIZED handles it
});
module.exports = pool;
