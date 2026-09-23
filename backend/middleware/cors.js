const cors = require('cors');

// ============================================================
// ALLOWED ORIGINS
// ============================================================
const allowedOrigins = [
  // Local development
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5500',

  // EagleVision dashboard (production)
  'https://eaglevision-cloudboard.onrender.com',

  // Qoech Technologies website (public — submits system requests)
  'https://qoechtechnologies.vercel.app',

  // Future custom domain (once DNS is set up)
  'https://qoechtech.com',
  'https://www.qoechtech.com',
];

// ============================================================
// CORS CONFIG
// ============================================================
module.exports = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Allow any origin in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Check against whitelist
    if (allowedOrigins.indexOf(origin) === -1) {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(
        new Error(
          'The CORS policy for this site does not allow access from the specified Origin.'
        ),
        false
      );
    }

    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
