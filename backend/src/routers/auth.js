const router = require('express').Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

router.post('/login', rateLimiter, authController.login);
router.post('/logout', auth, authController.logout);
router.get('/check', auth, authController.check);

module.exports = router;
