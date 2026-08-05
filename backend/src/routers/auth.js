const router = require('express').Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// No rate limiter for now – we'll add it back once everything works
router.post('/login', authController.login);
router.post('/logout', auth, authController.logout);
router.get('/check', auth, authController.check);

module.exports = router;
