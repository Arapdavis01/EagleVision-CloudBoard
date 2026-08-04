const router = require('express').Router();
const projectController = require('../controllers/projectController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', projectController.getAll);
router.post('/', projectController.create);
router.get('/:id', projectController.getOne);
router.put('/:id', projectController.update);
router.delete('/:id', projectController.delete);

module.exports = router;
