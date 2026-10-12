// ============================================================
// EAGLEVISION CLOUDBOARD — MONITORING CRON
// ============================================================
// Infrastructure + project health monitor.
//
//   • Every 30s: probe every due target in parallel
//   • Every 5 min: refresh the dynamic target list from `projects`
//   • Debounce: N consecutive fails → down (N varies by host)
//   • Debounce: 3 consecutive OKs → up
//   • Latency > per-host threshold → degraded (immediate)
//   • HTTP 429 / 5xx → forced degraded (transient, not down)
//   • State changes → monitoring_events + WebSocket broadcast
//
// Static targets (infrastructure):
//   • Cloudboard Postgres DB
//   • Cloudboard Web (/health on localhost)
//
// Dynamic targets (project homepages):
//   • Sourced from `projects` table where status IN ('Live','Maintenance')
//   • Refreshed every 5 min. Keeps last-known list if refresh fails.
//   • Auto-discovers newly added projects (no deploy needed).
//   • Per-host thresholds: Vercel fast, Render tolerant (cold starts
//     AND rate limits → 60s cadence), custom domains mid-range.
//
// Manual triggers (used by POST /api/monitoring/refresh):
//   • triggerTick()          — force an immediate probe of all targets
//   • forceRefreshTargets()  — force an immediate re-query of `projects`
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
    probeEveryNTicks: 1,
  },
  {
    id: 'cloudboard-web',
    name: 'Cloudboard Web',
    kind: 'http',
    url: `http://localhost:${process.env.PORT || 5000}/health`,
    degradedAfterMs: 500,
    timeoutMs: 5000,
    failsToDown: 3,
    probeEveryNTicks: 1,
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
let tickCounter = 0;                // increments on every tick
let tickInFlight = false;           // guard against overlapping ticks


// ============================================================
// HOST CLASSIFICATION
// ============================================================
// Returns host-specific thresholds AND cadence.
//
// `probeEveryNTicks` controls how often the target is probed:
//   • 1 → probed every tick (30s)
//   • 2 → probed every other tick (60s)
//
// Render free tier rate-limits requests. Probing every 30s can
// trigger HTTP 429. 60s cadence stays well under the limit.
// ============================================================
function classifyHost(url) {
  let host = '';
  try { host = new URL(url).hostname; } catch (_) {}

  if (host.endsWith('.vercel.app')) {
    return { degradedAfterMs: 800,  timeoutMs: 5000,  failsToDown: 3, probeEveryNTicks: 1 };
  }
  if (host.endsWith('.onrender.com')) {
    // Render free tier sleeps after 15 min idle → 30–60s cold start,
    // AND rate-limits at ~100 req/hour. Tolerate cold starts with a
    // longer timeout, and halve the probe rate to avoid 429s.
    return { degradedAfterMs: 3000, timeoutMs: 15000, failsToDown: 5, probeEveryNTicks: 2 };
  }
  if (host.endsWith('.netlify.app')) {
    return { degradedAfterMs: 800,  timeoutMs: 5000,  failsToDown: 3, probeEveryNTicks: 1 };
  }
  // Custom domains, unknown hosts — mid-range defaults
  return { degradedAfterMs: 1500, timeoutMs: 8000, failsToDown: 3, probeEveryNTicks: 1 };
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
        probeEveryNTicks: hostCfg.probeEveryNTicks,
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

/**
 * Probe an HTTP(S) URL.
 *
 * Response classification:
 *   2xx                     → ok, up
 *   429 (Too Many Requests) → ok=true, forceDegraded (transient, not down)
 *   5xx (server error)      → ok=true, forceDegraded (transient, not down)
 *   4xx (except 429)        → ok=false, error — real client error
 *   network error / timeout → ok=false, error
 *
 * `forceDegraded` tells applyProbe() to flip the target to 'degraded'
 * instead of counting the probe as a failure.
 */
async function probeHttp(target) {
  const start = Date.now();
  const timeout = target.timeoutMs ?? PROBE_TIMEOUT;

  try {
    const res = await fetch(target.url, {
      signal: AbortSignal.timeout(timeout),
      redirect: 'follow',
    });

    const latency = Date.now() - start;

    // Happy path
    if (res.ok) {
      return { ok: true, latency };
    }

    // Transient — rate limit or server-side hiccup.
    // The site is alive and responding; it just won't answer *now*.
    // Report degraded, not down.
    if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
      return {
        ok: true,
        latency,
        error: `HTTP ${res.status} (transient)`,
        forceDegraded: true,
      };
    }

    // 4xx other than 429 — a real client error (404, 403, etc.)
    return {
      ok: false,
      latency,
      error: `HTTP ${res.status}`,
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
 *
 * A probe result may carry `forceDegraded: true` (set by probeHttp
 * for transient responses like HTTP 429 / 5xx). When present, the
 * status flips to 'degraded' immediately — the probe is not counted
 * as a failure, and does not trigger the down-debounce.
 */
function applyProbe(entry, probe, target) {
  const previous = entry.status;
  const now = Date.now();

  const degradedAfter = target?.degradedAfterMs ?? DEGRADED_AFTER;
  const failsToDown   = target?.failsToDown     ?? FAILS_TO_DOWN;

  if (!probe.ok) {
    // Real failure — count it, and flip to down after enough in a row
    entry.consecutiveFails += 1;
    entry.consecutiveOks = 0;

    if (entry.consecutiveFails >= failsToDown && entry.status !== 'down') {
      entry.status = 'down';
      entry.since = now;
    }
  } else {
    // Success — reset the failure counter
    entry.consecutiveOks += 1;
    entry.consecutiveFails = 0;

    if (probe.forceDegraded) {
      // Transient signal (429 / 5xx) — degrade, but don't wait for
      // three successful probes to recover.
      if (entry.status !== 'degraded') {
        entry.status = 'degraded';
        entry.since = now;
      }
    } else if (probe.latency > degradedAfter) {
      // Slow but responding — immediate degraded
      if (entry.status !== 'degraded') {
        entry.status = 'degraded';
        entry.since = now;
      }
    } else {
      // Healthy latency. Only promote to 'up' after OKS_TO_UP
      // consecutive healthy probes — unless this is the first
      // verdict (unknown → up on the very first probe).
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
async function tick(options = {}) {
  const { forceAll = false } = options;

  // Prevent overlapping ticks (auto-refresh can collide with manual)
  if (tickInFlight) {
    console.log('[monitor] tick skipped — previous tick still running');
    return;
  }
  tickInFlight = true;

  try {
    tickCounter += 1;

    // Refresh dynamic targets every 5 minutes (or forced)
    if (forceAll || Date.now() - lastTargetRefresh > TARGET_REFRESH_MS) {
      await refreshDynamicTargets();
      lastTargetRefresh = Date.now();
    }

    // Snapshot every known target
    const allTargets = Object.values(state)
      .map((e) => e._config)
      .filter(Boolean);

    if (allTargets.length === 0) {
      console.log('[monitor] no targets yet');
      return;
    }

    // Pick the targets due on this tick.
    // When forceAll is true (manual refresh), probe everything regardless
    // of probeEveryNTicks — the user asked explicitly.
    const dueTargets = forceAll
      ? allTargets
      : allTargets.filter((t) => {
          const every = t.probeEveryNTicks ?? 1;
          return tickCounter % every === 0;
        });

    if (dueTargets.length === 0) return;

    // Probe them all in parallel
    const results = await Promise.all(dueTargets.map(probeTarget));

    // Apply, log, broadcast
    const line = [];
    for (let i = 0; i < dueTargets.length; i++) {
      const t = dueTargets[i];
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

    const prefix = forceAll ? '[monitor] (forced)' : '[monitor]';
    console.log(`${prefix} ${line.join('  ')}`);
  } finally {
    tickInFlight = false;
  }
}


// ============================================================
// PUBLIC MANUAL TRIGGERS
// ============================================================
// Called by routes/monitoring.js when the frontend hits the
// manual-refresh button (POST /api/monitoring/refresh).
//
// triggerTick():
//   • Forces a re-query of the projects table (so new projects
//     appear instantly instead of waiting up to 5 minutes)
//   • Probes every target regardless of probeEveryNTicks
//   • Broadcasts results to all connected WS clients
//
// Returns a summary the route can send back to the client.

async function triggerTick() {
  await tick({ forceAll: true });

  // Return a compact summary — the frontend already gets the full
  // state via WS, but this is useful for a "refreshed N targets" toast.
  const entries = Object.values(state);
  const summary = {
    timestamp: Date.now(),
    total: entries.length,
    up: entries.filter((e) => e.status === 'up').length,
    degraded: entries.filter((e) => e.status === 'degraded').length,
    down: entries.filter((e) => e.status === 'down').length,
    unknown: entries.filter((e) => e.status === 'unknown').length,
  };
  return summary;
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
  triggerTick,
  getState,
  getPublicState,
};
