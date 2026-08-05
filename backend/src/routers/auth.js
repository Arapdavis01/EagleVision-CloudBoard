const router = require('express').Router();
const ctrl = require('../controllers/authController');
const auth = require('../middleware/auth');
const limiter = require('../middleware/rateLimiter');
router.post('/login', limiter, ctrl.login);
router.post('/logout', auth, ctrl.logout);
router.get('/check', auth, ctrl.check);
module.exports = router;
