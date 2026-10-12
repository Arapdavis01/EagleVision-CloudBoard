// ============================================================
// EAGLEVISION CLOUDBOARD — MONITORING CRON
// ============================================================
// Infrastructure health monitor. Runs every 30 seconds and probes:
//   • Cloudboard's Postgres DB (via the existing shared pool)
//   • Cloudboard's own web server (/health endpoint)
//
// This is SEPARATE from jobs/uptimeCron.js, which checks CLIENT
// projects every 5 minutes and writes to uptime_logs. That job is
// client-facing; this one is internal. They answer different
// questions at different cadences and should never be merged.
//
// Step 1 scope:
//   • Probe both targets in parallel
//   • Compute verdict: up | degraded | down
//   • Cache in memory
//   • Log each tick to the terminal
//
// NOT in Step 1 (later):
//   • Debounce (3 consecutive fails before flipping to "down")
//   • Persist state changes to a monitoring_events table
//   • WebSocket broadcast
// ============================================================

const cron = require('node-cron');
const pool = require('../config/db');


// ============================================================
// CONFIG
// ============================================================
const INTERVAL_CRON   = '*/30 * * * * *';  // every 30 seconds
const PROBE_TIMEOUT   = 5000;               // ms — per-probe timeout
const DEGRADED_AFTER  = 500;                // ms — latency above this = degraded


// ============================================================
// TARGETS — one entry per thing we monitor
// ============================================================
// Adding a target = adding a block here. `id` is the stable key
// used everywhere downstream (state cache, events table, WS payload).
// ============================================================
const TARGETS = [
  { id: 'cloudboard-db',  name: 'Cloudboard Postgres', kind: 'postgres' },
  { id: 'cloudboard-web', name: 'Cloudboard Web',      kind: 'http'     },
];


// ============================================================
// IN-MEMORY STATE
// ============================================================
// Primary source of truth for "what is the current status".
// (Later we'll also write changes to the DB for history, but the
// memory cache is what the API and WebSocket read from, so the
// hub works even when the DB is down.)
// ============================================================
const state = {};
for (const t of TARGETS) {
  state[t.id] = {
    id: t.id,
    name: t.name,
    status: 'unknown',     // 'up' | 'degraded' | 'down' | 'unknown'
    latency: null,         // ms
    error: null,           // string | null
    lastChecked: null,     // epoch ms
  };
}


// ============================================================
// PROBES
// ============================================================

/**
 * Probe the shared Postgres pool with a trivial query.
 * Reuses the warm pool from config/db.js — no new connection.
 */
async function probeDB() {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return { ok: false, latency: Date.now() - start, error: err.message };
  }
}

/**
 * Probe our own Express server's /health endpoint.
 * Same process, so this is a loopback request — fast and reliable.
 * Catches: routes broken, event loop stalled, /health handler throws.
 * Misses:  whole-process freeze (needs an external pinger — later).
 */
async function probeWeb() {
  const start = Date.now();
  const port = process.env.PORT || 5000;
  try {
    const res = await fetch(`http://localhost:${port}/health`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT),
    });
    return { ok: res.ok, latency: Date.now() - start, error: res.ok ? null : `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, latency: Date.now() - start, error: err.message };
  }
}


// ============================================================
// VERDICT
// ============================================================
function verdict(probe) {
  if (!probe.ok) return 'down';
  if (probe.latency > DEGRADED_AFTER) return 'degraded';
  return 'up';
}


// ============================================================
// ONE TICK
// ============================================================
async function tick() {
  const [db, web] = await Promise.all([probeDB(), probeWeb()]);

  const now = Date.now();
  state['cloudboard-db']  = { ...state['cloudboard-db'],  status: verdict(db),  latency: db.latency,  error: db.error,  lastChecked: now };
  state['cloudboard-web'] = { ...state['cloudboard-web'], status: verdict(web), latency: web.latency, error: web.error, lastChecked: now };

  // Compact one-line log per tick
  const fmt = (s) => `${s.status}(${s.latency}ms)`;
  console.log(`[monitor] db=${fmt(state['cloudboard-db'])}  web=${fmt(state['cloudboard-web'])}`);
}


// ============================================================
// START / STOP
// ============================================================
let task = null;

function startMonitoringCron() {
  if (task) return task;

  task = cron.schedule(INTERVAL_CRON, async () => {
    try {
      await tick();
    } catch (err) {
      // Never let a tick crash the process
      console.error('[monitor] tick failed:', err.message);
    }
  });

  console.log(`[monitor] cron started (${INTERVAL_CRON} = every 30s)`);

  // Run one tick immediately so the terminal shows output right away
  tick().catch((err) => console.error('[monitor] initial tick failed:', err.message));

  return task;
}

function stopMonitoringCron() {
  if (task) {
    task.stop();
    task = null;
    console.log('[monitor] cron stopped');
  }
}


// ============================================================
// PUBLIC ACCESS (used by Step 2's /api/monitoring/state)
// ============================================================
function getState() {
  return state;
}


// ============================================================
// EXPORT
// ============================================================
module.exports = {
  startMonitoringCron,
  stopMonitoringCron,
  getState,
};
