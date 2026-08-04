require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const startCron = require('./src/services/cron');
const authRoutes = require('./src/routers/auth');
const projectRoutes = require('./src/routers/projects');
const financeRoutes = require('./src/routers/finance');
const uptimeRoutes = require('./src/routers/uptime');

const app = express();

// ---------- CORS ----------
// In production the frontend is served by the same server → no CORS needed.
// In development we allow localhost:5173 (Vite dev server).
const isProduction = process.env.NODE_ENV === 'production';
const corsOrigin = isProduction
  ? false   // disable CORS entirely (same-origin)
  : process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// ---------- Body & cookie parsing ----------
app.use(express.json());
app.use(cookieParser());

// ---------- API routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/uptime', uptimeRoutes);

// ---------- Health check ----------
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ---------- Serve frontend in production ----------
if (isProduction) {
  // The frontend build output lives at:  ../frontend/dist  (relative to this server.js)
  const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendPath));

  // For any route that is not an API route and doesn't match a static file,
  // send index.html (so React Router can handle client-side routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// ---------- Start server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🦅 EagleVision server running on port ${PORT}`);
  startCron();
});
