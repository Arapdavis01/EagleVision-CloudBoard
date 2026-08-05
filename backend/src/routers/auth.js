const router = require('express').Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Temporarily remove rate limiter to isolate the issue – you can add it back later
router.post('/login', authController.login);
router.post('/logout', auth, authController.logout);
router.get('/check', auth, authController.check);

module.exports = router;
