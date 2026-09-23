const router = require('express').Router();
const ctrl = require('../controllers/systemRequestController');
const { publicFormProtection } = require('../middleware/spamProtection');

// ============================================================
// PUBLIC ROUTES — No authentication required
// Used by the Qoech Technologies website
// ============================================================

// POST /api/public/system-requests
// Submit a new system request from the public form
router.post(
  '/system-requests',
  publicFormProtection,
  ctrl.submitRequest
);

module.exports = router;
