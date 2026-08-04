require('dotenv').config();
const pool = require('./config/db');
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function seed() {
  console.log('Creating admin account...');
  const email = await new Promise(resolve => rl.question('Admin email: ', resolve));
  const password = await new Promise(resolve => rl.question('Password: ', resolve));
  rl.close();
  const hash = await bcrypt.hash(password, 12);
  await pool.query('INSERT INTO admins (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING', [email, hash]);
  console.log('Admin seeded successfully.');
  process.exit(0);
}
seed();
