const router = require('express').Router();
const ctrl = require('../controllers/projectController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

// ==================== BASIC PROJECT CRUD ====================
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);

// ==================== PROJECT UPDATES (SERVICE RECORD) ====================
router.get('/:projectId/updates', ctrl.getProjectUpdates);
router.post('/:projectId/updates', ctrl.createProjectUpdate);
router.put('/updates/:id', ctrl.updateProjectUpdate);
router.delete('/updates/:id', ctrl.deleteProjectUpdate);

// ==================== COMBINED REVIEW & UPDATE ====================
router.post('/:projectId/review-and-update', ctrl.reviewAndUpdate);

// ==================== PROJECT HEALTH SCORE ====================
router.get('/:projectId/health', ctrl.getProjectHealth);

// ==================== PROJECT COST ANALYTICS ====================
router.get('/:projectId/cost-analytics', ctrl.getProjectCostAnalytics);

// ==================== SINGLE PROJECT OPERATIONS ====================
// Note: These must come AFTER specific routes like /:projectId/updates,
// /:projectId/health, etc. to avoid route conflicts
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
