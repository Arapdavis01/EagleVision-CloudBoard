// ============================================================
// EAGLEVISION CLOUDBOARD — CORS MIDDLEWARE
// ============================================================
// Handles both regular requests AND preflight OPTIONS.
// No `app.options('*', cors)` needed in server.js.
//
// Configuration priority:
//   1. process.env.ALLOWED_ORIGINS (comma-separated) — use this
//      to add staging/preview URLs without a code deploy
//   2. Hardcoded fallback list (below)
//
// Notes:
//   • `maxAge: 86400` caches preflight for 24h — halves non-GET API calls
//   • Render preview URLs (*.onrender.com) matching the main service
//     are auto-allowed
//   • If NODE_ENV is missing, we default to PRODUCTION behavior
//     (fail-safe: never silently allow any origin with credentials)
// ============================================================

const cors = require('cors');


// ============================================================
// 1. ALLOWED ORIGINS — ENV + HARDCODED FALLBACK
// ============================================================
const HARDCODED_ORIGINS = [
  // ---------- Local development ----------
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5500',

  // ---------- EagleVision dashboard (production) ----------
  'https://eaglevision-cloudboard.onrender.com',

  // ---------- Qoech Technologies website (public) ----------
  'https://qoechtechnologies.co.ke',
  'https://www.qoechtechnologies.co.ke',

  // Legacy origins — verify zero traffic via Render logs before removing.
  'https://qoechtechnologies.vercel.app',
  'https://qoechtech.com',
  'https://www.qoechtech.com',
];

// If ALLOWED_ORIGINS is set (comma-separated), it takes precedence.
// Example in Render env vars:
//   ALLOWED_ORIGINS=https://a.com,https://b.com,https://staging.example.com
const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = envOrigins.length > 0 ? envOrigins : HARDCODED_ORIGINS;


// ============================================================
// 2. RENDER PREVIEW PATTERN
// ============================================================
// Matches preview deployments of the EagleVision service:
//   https://eaglevision-cloudboard-pr-42.onrender.com
//   https://eaglevision-cloudboard-xyz.onrender.com
// But NOT unrelated *.onrender.com apps.
const RENDER_PREVIEW_PATTERN =
  /^https:\/\/eaglevision-cloudboard[a-z0-9-]*\.onrender\.com$/;


// ============================================================
// 3. ENVIRONMENT CHECK
// ============================================================
// Fail-safe: if NODE_ENV is missing, treat as PRODUCTION.
// This prevents a misconfigured deploy from allowing any origin
// with credentials.
const IS_DEV = process.env.NODE_ENV === 'development';


// ============================================================
// 4. CORS CONFIG
// ============================================================
module.exports = cors({
  origin: function (origin, callback) {
    // ----- No origin: mobile apps, curl, Postman, server-to-server -----
    // These are safe because they can't be exploited by a browser.
    if (!origin) return callback(null, true);

    // ----- Development: allow anything -----
    // Explicitly gated on NODE_ENV === 'development' (not just !== production).
    if (IS_DEV) return callback(null, true);

    // ----- Exact whitelist match -----
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ----- Render preview deployments -----
    if (RENDER_PREVIEW_PATTERN.test(origin)) {
      return callback(null, true);
    }

    // ----- Blocked -----
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(
      new Error('The CORS policy for this site does not allow access from the specified Origin.'),
      false
    );
  },

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
  ],

  // Expose these headers so the frontend can read them if needed
  exposedHeaders: ['Content-Length', 'Content-Range'],

  // Cache preflight response for 24h — halves non-GET API calls
  maxAge: 86400,

  // Pass preflight success to the browser (default is 204, which is fine)
  optionsSuccessStatus: 204,
});
