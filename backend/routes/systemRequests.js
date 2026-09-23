const router = require('express').Router();
const ctrl = require('../controllers/systemRequestController');
const auth = require('../middleware/authMiddleware');

// ============================================================
// ADMIN ROUTES — All require authentication
// ============================================================
router.use(auth);

// Stats (must come BEFORE /:id)
router.get('/stats', ctrl.getStats);

// List & detail
router.get('/', ctrl.getAllRequests);
router.get('/:id', ctrl.getRequest);

// Update fields
router.put('/:id', ctrl.updateRequest);

// Actions
router.post('/:id/approve', ctrl.approveRequest);
router.post('/:id/reject', ctrl.rejectRequest);
router.post('/:id/convert', ctrl.markAsConverted);

// Delete
router.delete('/:id', ctrl.deleteRequest);

module.exports = router;
