const router = require('express').Router();
const ctrl = require('../controllers/projectController');
const auth = require('../middleware/auth');

// Public route – no auth required
router.get('/public/:token', ctrl.publicStatus);

// Protected routes
router.use(auth);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;
