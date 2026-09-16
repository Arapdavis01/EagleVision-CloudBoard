// backend/scripts/rehash-password.js
// Run once: node backend/scripts/rehash-password.js
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const BCRYPT_COST = 8;

async function rehashAll() {
  try {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
      console.log('Usage: node rehash-password.js <email> <password>');
      console.log('Example: node rehash-password.js admin@example.com mypassword');
      process.exit(1);
    }

    const newHash = await bcrypt.hash(password, BCRYPT_COST);

    const result = await pool.query(
      'UPDATE admins SET password_hash = $1 WHERE email = $2 RETURNING id, email',
      [newHash, email]
    );

    if (result.rowCount === 0) {
      console.log('❌ Admin not found');
      process.exit(1);
    }

    console.log(`✅ Rehashed password for ${result.rows[0].email} with cost ${BCRYPT_COST}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Rehash failed:', err);
    process.exit(1);
  }
}

rehashAll();
