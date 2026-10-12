// ============================================================
// EAGLEVISION CLOUDBOARD — MONITORING ROUTES
// ============================================================
// Read-only endpoints for the Monitoring page.
//
//   GET /api/monitoring/state   → current snapshot of every target
//
// Auth: relies on whatever middleware you use for /api routes.
// If your app requires a session cookie for all /api/* routes,
// this inherits it. If not, it's public — decide intentionally.
// ============================================================

const express = require('express');
const { getPublicState } = require('../jobs/monitoringCron');

const router = express.Router();


// ============================================================
// GET /api/monitoring/state
// ============================================================
// Returns the in-memory snapshot of every target.
// This reads from RAM, not DB — so it works even if the DB is down.
// ============================================================
router.get('/state', (req, res) => {
  res.json({
    timestamp: Date.now(),
    targets: getPublicState(),
  });
});


module.exports = router;
