import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import paymentRoutes from './routes/payment.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { env } from './config/env';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve React static files in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);

export default app;
