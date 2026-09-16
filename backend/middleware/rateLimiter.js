const rateLimit = require('express-rate-limit');

// Strict rate limit for login attempts
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                    // 10 attempts per IP per 15 min
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limit for other routes
exports.generalLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 300,                   // 300 requests per minute
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
