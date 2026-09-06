const router = require('express').Router();
const ctrl = require('../controllers/servicePlanController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

// Stats
router.get('/stats', ctrl.getStats);

// CRUD
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// Actions
router.post('/:id/approve', ctrl.approvePlan);
router.post('/:id/complete', ctrl.completePlan);
router.post('/:id/reopen', ctrl.reopenPlan);
router.post('/:id/cancel', ctrl.cancelPlan);

module.exports = router;
