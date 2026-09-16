const router = require('express').Router();
const ctrl = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/rateLimiter');

// ==================== EMAIL / PASSWORD LOGIN ====================
// Rate-limited to prevent brute-force attacks (10 attempts per 15 min)
router.post('/login', loginLimiter, ctrl.login);

// ==================== QR CODE LOGIN ====================
router.post('/qr/session', ctrl.generateLoginSession);                 // start QR session (public)
router.get('/qr/session/:token/status', ctrl.checkLoginSessionStatus); // laptop polls this (public)
router.post('/qr/session/:token/approve', ctrl.approveLoginSession);   // phone approves with PIN (public)

// ==================== LOGOUT & SESSION ====================
router.post('/logout', authMiddleware, ctrl.logout);
router.get('/session', authMiddleware, ctrl.checkSession);

module.exports = router;
