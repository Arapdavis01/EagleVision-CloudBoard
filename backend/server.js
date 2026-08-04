require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { startCron } = require('./src/services/cron'); // note: we'll export { startCron }

const authRoutes = require('./src/routers/auth');
const projectRoutes = require('./src/routers/projects');
const financeRoutes = require('./src/routers/finance');
const uptimeRoutes = require('./src/routers/uptime');

const app = express();

// CORS
const isProduction = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: isProduction ? false : (process.env.FRONTEND_URL || 'http://localhost:5173'),
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/uptime', uptimeRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend in production
if (isProduction) {
  const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🦅 EagleVision running on port ${PORT}`);
  startCron(); // starts the uptime cron job
});
