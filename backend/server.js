require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { startCron } = require('./src/services/cron');
const authRoutes = require('./src/routers/auth');
const projectRoutes = require('./src/routers/projects');
const financeRoutes = require('./src/routers/finance');
const uptimeRoutes = require('./src/routers/uptime');

const app = express();
app.set('trust proxy', 1);

// Explicitly allow your static site – no more CORS issues
const allowedOrigin = 'https://eaglevision-cloudboard.onrender.com';

app.use(cors({
  origin: allowedOrigin,
  credentials: true,          // allows cookies / auth headers
}));

app.use(express.json());
app.use(cookieParser());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/uptime', uptimeRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🦅 EagleVision API running on port ${PORT}`);
  startCron();
});
