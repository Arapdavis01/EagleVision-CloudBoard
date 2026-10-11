// ============================================================
// EAGLEVISION CLOUDBOARD — POSTGRES CONNECTION POOL
// ============================================================
// A single shared Pool instance for the entire app.
// Tuned for Render's free-tier Postgres + Node 18.
//
// Notes:
//   • Do NOT create additional Pool instances. `require` this
//     file everywhere you need DB access.
//   • The pool warm-up runs once on first import — it costs one
//     connection for <50ms and eliminates the first-request
//     TCP+SSL handshake delay.
// ============================================================

const { Pool } = require('pg');


// ============================================================
// POOL CONFIGURATION
// ============================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // ---------- Pool size ----------
  // 20 is comfortable for a single-instance Node app on Render.
  // Postgres default max_connections is 100; Supabase often allows
  // ~60 per connection string, so 20 is well within limits.
  max: 20,
  min: 2,   // keep 2 warm connections ready at all times

  // ---------- Timeouts ----------
  connectionTimeoutMillis: 5000,   // fail fast if pool is exhausted
  idleTimeoutMillis: 30000,        // recycle idle connections after 30s
  statement_timeout: 10000,        // kill any query running >10s
  query_timeout: 10000,            // client-side query timeout

  // ---------- Networking ----------
  keepAlive: true,                 // detect silently-dropped TCP connections
  keepAliveInitialDelayMillis: 10000,

  // ---------- SSL ----------
  // Required for Supabase / most managed Postgres. `rejectUnauthorized:
  // false` is safe because the connection is encrypted; it just skips
  // the CA chain check (which Supabase's cert doesn't chain to a
  // public root).
  ssl: {
    rejectUnauthorized: false,
  },
});


// ============================================================
// STARTUP WARM-UP
// ============================================================
// Establishes the first DB connection immediately so the first
// user request doesn't pay the TCP + SSL handshake cost.
// Failures are logged but do NOT crash the process.
pool.query('SELECT 1')
  .then(() => console.log('[db] pool warmed up'))
  .catch((err) => console.error('[db] warm-up failed:', err.message));


// ============================================================
// ERROR HANDLING
// ============================================================
// Idle-client errors are logged but should never crash the
// process — the pool will replace the dead client automatically.
pool.on('error', (err) => {
  console.error('[db] unexpected error on idle client:', err.message);
});


// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
// Close the pool when the process exits, so Render doesn't see
// orphaned connections.
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    pool.end()
      .then(() => console.log('[db] pool closed'))
      .catch((err) => console.error('[db] pool close failed:', err.message));
  });
});


// ============================================================
// EXPORT
// ============================================================
module.exports = pool;
