// ============================================================
// EAGLEVISION CLOUDBOARD — MONITORING CRON
// ============================================================
// Infrastructure health monitor. Runs every 30 seconds and probes:
//   • Cloudboard's Postgres DB (via the existing shared pool)
//   • Cloudboard's own web server (/health endpoint)
//
// SEPARATE from jobs/uptimeCron.js (client-facing, every 5 min).
//
// Step 4 scope:
//   • Debounce: 3 consecutive failures → down
//   • Debounce: 3 consecutive successes → up
//   • Latency > DEGRADED_AFTER → degraded (immediate, no debounce)
//   • State machine keeps `since` (when the current status began)
//   • State changes persisted to monitoring_events table
//   • State changes broadcast over WebSocket via ws/statusHub.js
// ============================================================

const cron = require('node-cron');
const pool = require('../config/db');
const { broadcastStatusChange } = require('../ws/statusHub');


// ============================================================
// CONFIG
// ============================================================
const INTERVAL_CRON   = '*/30 * * * * *';   // every 30 seconds
const PROBE_TIMEOUT   = 5000;                // ms — per-probe timeout
const DEGRADED_AFTER  = 500;                 // ms — latency above this = degraded
const FAILS_TO_DOWN   = 3;                   // consecutive fails before flipping to down
const OKS_TO_UP       = 3;                   // consecutive oks before flipping back to up


// ============================================================
// TARGETS
// ============================================================
const TARGETS = [
  { id: 'cloudboard-db',  name: 'Cloudboard Postgres', kind: 'postgres' },
  { id: 'cloudboard-web', name: 'Cloudboard Web',      kind: 'http'     },
];


// ============================================================
// IN-MEMORY STATE
// ============================================================
// For each target we track:
//   status        — current verdict: 'up' | 'degraded' | 'down' | 'unknown'
//   since         — epoch ms when the current status began
//   latency       — ms of the most recent probe
//   error         — most recent error message, or null
//   lastChecked   — epoch ms of the most recent probe
//   consecutiveFails — count of consecutive probe failures
//   consecutiveOks   — count of consecutive probe successes
//
// `status` flips only when the debounce thresholds are crossed.
// `latency` / `error` / `lastChecked` update every tick regardless,
// so the UI always shows fresh numbers even when status is stable.
// ============================================================
const state = {};
for (const t of TARGETS) {
  state[t.id] = {
    id: t.id,
    name: t.name,
    status: 'unknown',
    since: null,
    latency: null,
    error: null,
    lastChecked: null,
    consecutiveFails: 0,
    consecutiveOks: 0,
  };
}


// ============================================================
// PROBES
// ============================================================
async function probeDB() {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return { ok: false, latency: Date.now() - start, error: err.message };
  }
}

async function probeWeb() {
  const start = Date.now();
  const port = process.env.PORT || 5000;
  try {
    const res = await fetch(`http://localhost:${port}/health`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT),
    });
    return {
      ok: res.ok,
      latency: Date.now() - start,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    return { ok: false, latency: Date.now() - start, error: err.message };
  }
}


// ============================================================
// STATE MACHINE
// ============================================================
/**
 * Apply one probe result to one target's state.
 * Returns true if `status` changed, false otherwise.
 *
 * Rules:
 *   • Probe failed → increment fails, reset oks.
 *     - status flips to 'down' when fails >= FAILS_TO_DOWN
 *   • Probe succeeded → increment oks, reset fails.
 *     - status flips to 'up' when oks >= OKS_TO_UP AND current is not 'up'
 *     - but if latency > DEGRADED_AFTER, immediate flip to 'degraded'
 *       (degraded is not a "failure" — it's a health signal)
 */
function applyProbe(entry, probe) {
  const previous = entry.status;
  const now = Date.now();

  if (!probe.ok) {
    entry.consecutiveFails += 1;
    entry.consecutiveOks = 0;

    if (entry.consecutiveFails >= FAILS_TO_DOWN && entry.status !== 'down') {
      entry.status = 'down';
      entry.since = now;
    }
  } else {
    entry.consecutiveOks += 1;
    entry.consecutiveFails = 0;

    // Latency-driven degraded is immediate — no debounce needed
    if (probe.latency > DEGRADED_AFTER) {
      if (entry.status !== 'degraded') {
        entry.status = 'degraded';
        entry.since = now;
      }
    } else {
      // Healthy latency. Only promote back to 'up' after OKS_TO_UP.
      // Special case: if we're at 'unknown', accept the first probe
      // immediately — no reason to wait 3 ticks to say "up".
      const isFirstVerdict = entry.status === 'unknown';
      const enoughOks = entry.consecutiveOks >= OKS_TO_UP;

      if (entry.status !== 'up' && (isFirstVerdict || enoughOks)) {
        entry.status = 'up';
        entry.since = now;
      }
    }
  }

  // Always refresh fresh data
  entry.latency     = probe.latency;
  entry.error       = probe.error || null;
  entry.lastChecked = now;

  return entry.status !== previous;
}


// ============================================================
// EVENT LOG
// ============================================================
/**
 * Persist a state change to the monitoring_events table.
 * Called only when applyProbe() returns true.
 *
 * Never throws — a failed log write should not kill the tick.
 * Note: this is fire-and-forget. If the DB itself is the target
 * that went down, the INSERT will fail; the state cache still
 * reflects reality, only the historical record is missing.
 */
async function recordEvent(entry, fromStatus) {
  try {
    await pool.query(
      `INSERT INTO monitoring_events
         (target_id, from_status, to_status, latency_ms, error)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.id,
        fromStatus,
        entry.status,
        entry.latency,
        entry.error || null,
      ]
    );
  } catch (err) {
    console.error(`[monitor] failed to log event for ${entry.id}:`, err.message);
  }
}


// ============================================================
// ONE TICK
// ============================================================
async function tick() {
  const [db, web] = await Promise.all([probeDB(), probeWeb()]);

  // Capture previous statuses BEFORE applying the new probes,
  // since applyProbe mutates entry.status in place.
  const prevDb  = state['cloudboard-db'].status;
  const prevWeb = state['cloudboard-web'].status;

  const dbChanged  = applyProbe(state['cloudboard-db'],  db);
  const webChanged = applyProbe(state['cloudboard-web'], web);

  const fmt = (s) => `${s.status}(${s.latency}ms)`;
  const flag = (changed) => (changed ? ' ⚠' : '');

  console.log(
    `[monitor] db=${fmt(state['cloudboard-db'])}${flag(dbChanged)}` +
    `  web=${fmt(state['cloudboard-web'])}${flag(webChanged)}`
  );

  // Snapshot for broadcast — computed once, used below.
  // Strip internal debounce counters before putting on the wire.
  const publicState = getPublicState();

  // Persist state changes — fire and forget so a DB hiccup
  // doesn't stall the next tick.
  if (dbChanged)  recordEvent(state['cloudboard-db'],  prevDb);
  if (webChanged) recordEvent(state['cloudboard-web'], prevWeb);

  // Broadcast to WebSocket clients — also fire-and-forget.
  // broadcast() returns 0 when no clients are connected, so this
  // is a no-op cost when nobody is watching.
  if (dbChanged) {
    broadcastStatusChange(
      publicState['cloudboard-db'],
      prevDb,
      state['cloudboard-db'].status
    );
  }
  if (webChanged) {
    broadcastStatusChange(
      publicState['cloudboard-web'],
      prevWeb,
      state['cloudboard-web'].status
    );
  }
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
      console.error('[monitor] tick failed:', err.message);
    }
  });

  console.log(`[monitor] cron started (every 30s, debounce ${FAILS_TO_DOWN} fails → down)`);

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
// PUBLIC ACCESS
// ============================================================
function getState() {
  return state;
}

/**
 * Shape the state for API consumers — strip internal debounce counters.
 * Returns a plain object keyed by target id.
 */
function getPublicState() {
  const out = {};
  for (const [id, entry] of Object.entries(state)) {
    out[id] = {
      id: entry.id,
      name: entry.name,
      status: entry.status,
      since: entry.since,
      latency: entry.latency,
      error: entry.error,
      lastChecked: entry.lastChecked,
    };
  }
  return out;
}


// ============================================================
// EXPORT
// ============================================================
module.exports = {
  startMonitoringCron,
  stopMonitoringCron,
  getState,
  getPublicState,
};
