const router = require('express').Router();
const ctrl = require('../controllers/servicePlanController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

// ==================== STATS ====================
router.get('/stats', ctrl.getStats);

// ==================== TEMPLATES ====================
// Note: These must be defined BEFORE /:id to avoid route conflicts
router.get('/templates', ctrl.getTemplates);
router.post('/templates', ctrl.createTemplate);
router.get('/templates/:id', ctrl.getTemplate);
router.post('/templates/:templateId/create', ctrl.createFromTemplate);
router.delete('/templates/:id', ctrl.deleteTemplate);

// ==================== BULK ACTIONS ====================
router.post('/bulk/status', ctrl.bulkUpdateStatus);
router.post('/bulk/priority', ctrl.bulkUpdatePriority);
router.post('/bulk/delete', ctrl.bulkDelete);

// ==================== CALENDAR ====================
router.get('/calendar', ctrl.getCalendarData);

// ==================== CRUD ====================
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// ==================== ACTIONS ====================
router.post('/:id/approve', ctrl.approvePlan);
router.post('/:id/complete', ctrl.completePlan);
router.post('/:id/reopen', ctrl.reopenPlan);
router.post('/:id/cancel', ctrl.cancelPlan);

module.exports = router;
