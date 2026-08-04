const router = require('express').Router();
const uptimeController = require('../controllers/uptimeController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/status', uptimeController.getStatuses);
router.get('/history/:projectId', uptimeController.getHistory);

module.exports = router;
