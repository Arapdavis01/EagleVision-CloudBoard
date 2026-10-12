// ============================================================
// EAGLEVISION CLOUDBOARD — MONITORING ROUTES
// ============================================================
// Endpoints for the Monitoring page.
//
//   GET  /api/monitoring/state        → current snapshot of every target
//   GET  /api/monitoring/events       → recent state changes (all targets)
//   GET  /api/monitoring/events/:id   → recent state changes for one target
//   POST /api/monitoring/refresh      → force an immediate probe of every target
//
// Auth: inherits whatever guards your other /api routes use.
// ============================================================

const express = require('express');
const pool = require('../config/db');
const {
  getPublicState,
  triggerTick,
} = require('../jobs/monitoringCron');

const router = express.Router();


// ============================================================
// GET /api/monitoring/state
// ============================================================
// Reads from the in-memory cache — works even when the DB is down.
// ============================================================
router.get('/state', (req, res) => {
  res.json({
    timestamp: Date.now(),
    targets: getPublicState(),
  });
});


// ============================================================
// GET /api/monitoring/events
// ============================================================
// Recent state changes across all targets, newest first.
//
// Query params:
//   limit  (default 20, max 100)
// ============================================================
router.get('/events', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const { rows } = await pool.query(
      `SELECT id, target_id, from_status, to_status, latency_ms, error, created_at
         FROM monitoring_events
        ORDER BY created_at DESC
        LIMIT $1`,
      [limit]
    );

    res.json({ events: rows });
  } catch (err) {
    next(err);
  }
});


// ============================================================
// GET /api/monitoring/events/:targetId
// ============================================================
// Recent state changes for a single target.
//
// Query params:
//   limit  (default 20, max 100)
// ============================================================
router.get('/events/:targetId', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const { targetId } = req.params;

    const { rows } = await pool.query(
      `SELECT id, target_id, from_status, to_status, latency_ms, error, created_at
         FROM monitoring_events
        WHERE target_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [targetId, limit]
    );

    res.json({ targetId, events: rows });
  } catch (err) {
    next(err);
  }
});


// ============================================================
// POST /api/monitoring/refresh
// ============================================================
// Force an immediate probe of every target.
//
// Called by the frontend manual-refresh button (⟳). This:
//   • Re-queries the `projects` table (so newly-added projects
//     appear instantly instead of waiting up to 5 minutes)
//   • Probes every target regardless of its probeEveryNTicks
//     cadence — the user asked explicitly, so we don't skip
//   • Broadcasts results to all connected WS clients
//
// Returns a summary so the frontend can show a toast like
// "Refreshed 10 targets — 9 up, 1 degraded".
//
// Re-entrancy: if a tick is already in flight (auto-refresh
// collided with this request), triggerTick() returns early
// with a log line — we still respond 200 with the current
// state summary so the user gets immediate feedback.
// ============================================================
router.post('/refresh', async (req, res, next) => {
  try {
    const summary = await triggerTick();
    res.json({
      ok: true,
      ...summary,
    });
  } catch (err) {
    next(err);
  }
});


module.exports = router;
