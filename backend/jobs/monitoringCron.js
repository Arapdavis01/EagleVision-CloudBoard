// ============================================================
// EAGLEVISION CLOUDBOARD — MONITORING CRON
// ============================================================
// Infrastructure + project health monitor.
//
//   • Every 30s: probe every known target in parallel
//   • Every 5 min: refresh the dynamic target list from `projects`
//   • Debounce: N consecutive fails → down (N varies by host)
//   • Debounce: 3 consecutive OKs → up
//   • Latency > per-host threshold → degraded (immediate)
//   • State changes → monitoring_events + WebSocket broadcast
//
// Static targets (infrastructure):
//   • Cloudboard Postgres DB
//   • Cloudboard Web (/health on localhost)
//
// Dynamic targets (project homepages):
//   • Sourced from `projects` table where status IN ('Live','Maintenance')
//   • Refreshed every 5 min. Keeps last-known list if refresh fails.
//   • Per-host thresholds: Vercel fast, Render tolerant (cold starts),
//     custom domains mid-range.
//
// Note: homepage probes only detect "HTML loads". A project whose
// frontend loads but whose backend is broken will show as UP. To
// catch that, add /health endpoints to each project and switch
// its target URL here to /health.
// ============================================================

const cron = require('node-cron');
const pool = require('../config/db');
const { broadcastStatusChange } = require('../ws/statusHub');


// ============================================================
// CONFIG
// ============================================================
const INTERVAL_CRON      = '*/30 * * * * *';        // every 30 seconds
const TARGET_REFRESH_MS  = 5 * 60 * 1000;            // refresh targets every 5 min
const PROBE_TIMEOUT      = 5000;                     // default ms
const DEGRADED_AFTER     = 500;                      // default ms
const FAILS_TO_DOWN      = 3;                        // default consecutive fails
const OKS_TO_UP          = 3;                        // consecutive OKs to flip up


// ============================================================
// STATIC TARGETS — infrastructure, always monitored
// ============================================================
// These NEVER come from the projects table. If the DB is down,
// we still want to see the DB card and the Cloudboard card.
// ============================================================
const STATIC_TARGETS = [
  {
    id: 'cloudboard-db',
    name: 'Cloudboard Postgres',
    kind: 'postgres',
    degradedAfterMs: 800,
    failsToDown: 3,
  },
  {
    id: 'cloudboard-web',
    name: 'Cloudboard Web',
    kind: 'http',
    url: `http://localhost:${process.env.PORT || 5000}/health`,
    degradedAfterMs: 500,
    timeoutMs: 5000,
    failsToDown: 3,
  },
];


// ============================================================
// IN-MEMORY STATE
// ============================================================
// Keyed by target id. Each entry carries the current verdict,
// the last probe results, and a reference to its target config
// (so probes and thresholds can read per-target settings).
// ============================================================
const state = {};

let dynamicTargets = [];            // last successfully loaded list
let lastTargetRefresh = 0;          // epoch ms of last successful refresh


// ============================================================
// HOST CLASSIFICATION
// ============================================================
function classifyHost(url) {
  let host = '';
  try { host = new URL(url).hostname; } catch (_) {}

  if (host.endsWith('.vercel.app')) {
    return { degradedAfterMs: 800,  timeoutMs: 5000,  failsToDown: 3 };
  }
  if (host.endsWith('.onrender.com')) {
    // Render free tier sleeps after 15 min idle → 30–60s cold start.
    // Tolerate: longer timeout, higher degraded threshold, more fails
    // before declaring down.
    return { degradedAfterMs: 3000, timeoutMs: 15000, failsToDown: 5 };
  }
  if (host.endsWith('.netlify.app')) {
    return { degradedAfterMs: 800,  timeoutMs: 5000,  failsToDown: 3 };
  }
  // Custom domains, unknown hosts — mid-range defaults
  return { degradedAfterMs: 1500, timeoutMs: 8000, failsToDown: 3 };
}


// ============================================================
// DYNAMIC TARGET REFRESH
// ============================================================
async function refreshDynamicTargets() {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, client, live_url, status, project_type
         FROM projects
        WHERE live_url IS NOT NULL
          AND live_url != ''
          AND status IN ('Live', 'Maintenance')
          AND live_url NOT LIKE '%eaglevision-cloudboard%'
        ORDER BY name`
    );

    const mapped = rows.map((r) => {
      const cleanUrl = (r.live_url || '').split('#')[0];   // strip hash fragments
      const hostCfg  = classifyHost(cleanUrl);
      return {
        id:   `project-${r.id}`,
        name: r.name?.trim() || `Project ${r.id}`,
        kind: 'http',
        url:  cleanUrl,
        client: r.client || null,
        projectId: r.id,
        degradedAfterMs: hostCfg.degradedAfterMs,
        timeoutMs:      hostCfg.timeoutMs,
        failsToDown:    hostCfg.failsToDown,
      };
    });

    // Detect changes for logging
    const before = new Set(dynamicTargets.map((t) => t.id));
    const after  = new Set(mapped.map((t) => t.id));
    const added   = [...after].filter((id) => !before.has(id));
    const removed = [...before].filter((id) => !after.has(id));

    dynamicTargets = mapped;

    if (added.length || removed.length) {
      console.log(`[monitor] targets refreshed: +${added.length} -${removed.length} (total dynamic: ${mapped.length})`);
      if (added.length)   console.log(`[monitor]   added: ${added.join(', ')}`);
      if (removed.length) console.log(`[monitor]   removed: ${removed.join(', ')}`);
    }

    syncStateWithTargets([...STATIC_TARGETS, ...dynamicTargets]);
  } catch (err) {
    // Keep the last-known list — don't wipe targets on a DB hiccup
    console.error('[monitor] target refresh failed (keeping last list):', err.message);
    syncStateWithTargets([...STATIC_TARGETS, ...dynamicTargets]);
  }
}


// ============================================================
// STATE SYNC
// ============================================================
function syncStateWithTargets(allTargets) {
  const wanted = new Set(allTargets.map((t) => t.id));

  // Add new / update existing
  for (const t of allTargets) {
    if (!state[t.id]) {
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
        _config: t,
      };
    } else {
      // Update config and name in case they changed
      state[t.id]._config = t;
      state[t.id].name = t.name;
    }
  }

  // Remove targets no longer wanted
  for (const id of Object.keys(state)) {
    if (!wanted.has(id)) {
      delete state[id];
    }
  }
}


// ============================================================
// PROBES
// ============================================================
async function probeDB(target) {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return { ok: false, latency: Date.now() - start, error: err.message };
  }
}

async function probeHttp(target) {
  const start = Date.now();
  const timeout = target.timeoutMs ?? PROBE_TIMEOUT;
  try {
    const res = await fetch(target.url, {
      signal: AbortSignal.timeout(timeout),
      redirect: 'follow',
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

function probeTarget(target) {
  return target.kind === 'postgres' ? probeDB(target) : probeHttp(target);
}


// ============================================================
// STATE MACHINE
// ============================================================
/**
 * Apply one probe result to one target's state.
 * Returns true if the STATUS changed, false otherwise.
 *
 * Per-target thresholds come from `target`:
 *   - target.degradedAfterMs   (default DEGRADED_AFTER)
 *   - target.failsToDown       (default FAILS_TO_DOWN)
 */
function applyProbe(entry, probe, target) {
  const previous = entry.status;
  const now = Date.now();

  const degradedAfter = target?.degradedAfterMs ?? DEGRADED_AFTER;
  const failsToDown   = target?.failsToDown     ?? FAILS_TO_DOWN;

  if (!probe.ok) {
    entry.consecutiveFails += 1;
    entry.consecutiveOks = 0;

    if (entry.consecutiveFails >= failsToDown && entry.status !== 'down') {
      entry.status = 'down';
      entry.since = now;
    }
  } else {
    entry.consecutiveOks += 1;
    entry.consecutiveFails = 0;

    if (probe.latency > degradedAfter) {
      if (entry.status !== 'degraded') {
        entry.status = 'degraded';
        entry.since = now;
      }
    } else {
      const isFirstVerdict = entry.status === 'unknown';
      const enoughOks = entry.consecutiveOks >= OKS_TO_UP;

      if (entry.status !== 'up' && (isFirstVerdict || enoughOks)) {
        entry.status = 'up';
        entry.since = now;
      }
    }
  }

  entry.latency     = probe.latency;
  entry.error       = probe.error || null;
  entry.lastChecked = now;

  return entry.status !== previous;
}


// ============================================================
// EVENT LOG
// ============================================================
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
  // Refresh dynamic targets every 5 minutes
  if (Date.now() - lastTargetRefresh > TARGET_REFRESH_MS) {
    await refreshDynamicTargets();
    lastTargetRefresh = Date.now();
  }

  // Snapshot current targets
  const targets = Object.values(state)
    .map((e) => e._config)
    .filter(Boolean);

  if (targets.length === 0) {
    console.log('[monitor] no targets yet');
    return;
  }

  // Probe all in parallel
  const results = await Promise.all(targets.map(probeTarget));

  // Apply, log, broadcast
  const line = [];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const r = results[i];
    const entry = state[t.id];
    if (!entry) continue;

    const prev = entry.status;
    const changed = applyProbe(entry, r, t);

    const flag = changed ? ' ⚠' : '';
    line.push(`${t.id}=${entry.status}(${entry.latency}ms)${flag}`);

    if (changed) {
      recordEvent(entry, prev);
      const publicEntry = getPublicState()[t.id];
      broadcastStatusChange(publicEntry, prev, entry.status);
    }
  }

  console.log(`[monitor] ${line.join('  ')}`);
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

  console.log(`[monitor] cron started (every 30s, ${FAILS_TO_DOWN} fails → down by default)`);

  // Kick off an immediate tick — the first one loads dynamic targets
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
 * Shape the state for API + WS consumers.
 * Strips internal counters and the target config.
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
