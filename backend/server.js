require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('./middleware/cors');
const errorHandler = require('./utils/errorHandler');
const { startUptimeCron } = require('./jobs/uptimeCron');

// Import route modules
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const financeRoutes = require('./routes/finance');
const dashboardRoutes = require('./routes/dashboard');
const alertRoutes = require('./routes/alerts');
const uptimeRoutes = require('./routes/uptime');
const publicRoutes = require('./routes/public');
const uploadRoutes = require('./routes/upload');
const servicePlanRoutes = require('./routes/servicePlans'); // ✅ NEW: Service Planner routes

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================
app.use(cors);
app.options('*', cors);   // handle preflight OPTIONS requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ==================== ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/uptime', uptimeRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/service-plans', servicePlanRoutes); // ✅ NEW: Service Planner endpoints

// Health check
app.get('/health', (req, res) => res.send('OK'));

// 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ==================== ERROR HANDLER ====================
app.use(errorHandler);

// ==================== CRON JOB ====================
startUptimeCron();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
