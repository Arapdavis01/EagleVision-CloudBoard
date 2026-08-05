const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // The sslmode is already set in the URL, so we can leave this empty
});
module.exports = pool;
