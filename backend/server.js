// ============================================================
// EAGLEVISION CLOUDBOARD — SERVER ENTRY POINT
// ============================================================
// Express server setup:
//   1. Environment + security middleware
//   2. Body parsers
//   3. Route modules
//   4. Health check + 404 handler
//   5. Error handler
//   6. Cron + WebSocket + listen
// ============================================================

require('dotenv').config();

const http          = require('http');                                              // ← STEP 4
const express       = require('express');
const cookieParser  = require('cookie-parser');
const compression   = require('compression');
const helmet        = require('helmet');

const cors                = require('./middleware/cors');
const errorHandler        = require('./utils/errorHandler');
const { startUptimeCron } = require('./jobs/uptimeCron');
const { startMonitoringCron, stopMonitoringCron } = require('./jobs/monitoringCron');
const { attachStatusHub, detachStatusHub } = require('./ws/statusHub');            // ← STEP 4

// ---------- Route modules ----------
const authRoutes            = require('./routes/auth');
const projectRoutes         = require('./routes/projects');
const financeRoutes         = require('./routes/finance');
const dashboardRoutes       = require('./routes/dashboard');
const alertRoutes           = require('./routes/alerts');
const uptimeRoutes          = require('./routes/uptime');
const publicRoutes          = require('./routes/public');
const uploadRoutes          = require('./routes/upload');
const servicePlanRoutes     = require('./routes/servicePlans');
const systemRequestRoutes   = require('./routes/systemRequests');
const publicRequestRoutes   = require('./routes/publicRequests');
const monitoringRoutes      = require('./routes/monitoring');

const app  = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';


// ============================================================
// 1. TRUST PROXY (Render / Heroku / Railway sit behind one)
// ============================================================
// Required for correct `req.ip`, `req.protocol`, `req.secure`
// — the rate limiter and CORS rely on these.
app.set('trust proxy', 1);


// ============================================================
// 2. SECURITY HEADERS
// ============================================================
// `helmet` sets safe defaults for CSP, X-Frame-Options, etc.
// We disable CSP here because the API serves JSON only — it's
// the frontend's job to set CSP.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));


// ============================================================
// 3. COMPRESSION — the single biggest speed win
// ============================================================
// Brotli/gzip on JSON responses typically cuts payload by 5–10×.
// `threshold: 1024` skips tiny responses (< 1KB) since the
// overhead of compressing them isn't worth it.
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));


// ============================================================
// 4. CORS
// ============================================================
// Your `middleware/cors.js` should already handle OPTIONS
// preflight — no separate `app.options('*', cors)` needed.
app.use(cors);


// ============================================================
// 5. BODY PARSERS
// ============================================================
// JSON body limit dropped from 10MB → 1MB. Uploads use
// `multipart/form-data` (handled by `multer` in the upload
// route), so 10MB of JSON was unnecessarily generous.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());


// ============================================================
// 6. REQUEST TIMING (dev only)
// ============================================================
// Logs requests slower than 500ms. Silent in production.
if (!IS_PROD) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      if (ms > 500) {
        console.warn(`[SLOW] ${req.method} ${req.originalUrl} — ${ms}ms`);
      }
    });
    next();
  });
}


// ============================================================
// 7. ROUTES
// ============================================================
app.use('/api/auth',            authRoutes);
app.use('/api/projects',        projectRoutes);
app.use('/api/finance',         financeRoutes);
app.use('/api/dashboard',       dashboardRoutes);
app.use('/api/alerts',          alertRoutes);
app.use('/api/uptime',          uptimeRoutes);
app.use('/api/public',          publicRoutes);
app.use('/api/upload',          uploadRoutes);
app.use('/api/service-plans',   servicePlanRoutes);
app.use('/api/system-requests', systemRequestRoutes);
app.use('/api/public',          publicRequestRoutes);
app.use('/api/monitoring',      monitoringRoutes);

// Health check — kept minimal (used by Render + frontend warm-up)
app.get('/health', (req, res) => res.status(200).send('OK'));

// 404 fallback for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});


// ============================================================
// 8. ERROR HANDLER (must be last)
// ============================================================
app.use(errorHandler);


// ============================================================
// 9. HTTP SERVER + WEBSOCKET HUB + LISTEN
// ============================================================
// Wrap the Express app in a raw http.Server so the WebSocket hub
// can attach to the same port. `app.listen()` returns an http.Server
// too, but hiding it inside the call means we can't pass it to
// `attachStatusHub()` — so we build it explicitly.
const server = http.createServer(app);                                              // ← STEP 4

// Attach the WebSocket hub at /ws
try {
  attachStatusHub(server);                                                          // ← STEP 4
} catch (err) {
  console.error('[ws] failed to attach status hub:', err);
  console.error(err.stack);
}

server.listen(PORT, () => {                                                         // ← STEP 4
  console.log(`[server] running on port ${PORT} (${IS_PROD ? 'production' : 'development'})`);

  // Start crons AFTER listen succeeds. If either throws, the server
  // is already up and Render won't kill the deployment.
  try {
    startUptimeCron();
    console.log('[cron] uptime monitor started');
  } catch (err) {
    console.error('[cron] failed to start:', err);
  }

  try {
    startMonitoringCron();
  } catch (err) {
    console.error('[monitor] failed to start:', err);
  }
});


// ============================================================
// 10. GRACEFUL SHUTDOWN
// ============================================================
// Stop crons and the WS hub first so their timers/sockets don't
// keep the event loop alive past server.close()'s callback.
const shutdown = (signal) => {
  console.log(`[server] ${signal} received, shutting down gracefully`);

  try {
    stopMonitoringCron();
  } catch (err) {
    console.error('[monitor] stop failed:', err);
  }

  try {
    detachStatusHub();                                                              // ← STEP 4
  } catch (err) {
    console.error('[ws] detach failed:', err);
  }

  server.close(() => process.exit(0));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;
