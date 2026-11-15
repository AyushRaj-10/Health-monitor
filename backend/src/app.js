import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { patientRouter } from './routes/patient.routes.js';
import { deviceRouter } from './routes/device.routes.js';
import { vitalsRouter } from './routes/vitals.routes.js';
import { simulatorRouter } from './routes/simulator.routes.js';
import { alertRouter } from './routes/alert.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

export const app = express();

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing with Credentials
app.use(
  cors({
    origin: [config.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Cookie Parser for HttpOnly Refresh Tokens
app.use(cookieParser());

// Request Logging
app.use(morgan(config.isDev ? 'dev' : 'combined'));

// Body Parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    project: 'Privacy-Aware Remote Patient Monitoring System using Edge Computing and IoMT',
    stage: 'Stage 3: IoMT Simulation & Vitals Data Collection',
    status: 'online',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      patients: '/api/patients',
      devices: '/api/devices',
      vitals: '/api/vitals',
    },
  });
});

// API Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/patients', patientRouter);
app.use('/api/devices', deviceRouter);
app.use('/api/vitals', vitalsRouter);
app.use('/api/simulator', simulatorRouter);
app.use('/api/alerts', alertRouter);
app.use('/api/analytics', analyticsRouter);

// 404 & Centralized Error Handling
app.use(notFoundHandler);
app.use(errorHandler);
