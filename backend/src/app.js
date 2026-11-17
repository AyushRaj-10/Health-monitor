import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { patientRouter } from './routes/patient.routes.js';
import { deviceRouter } from './routes/device.routes.js';
import { vitalsRouter } from './routes/vitals.routes.js';
import { simulatorRouter } from './routes/simulator.routes.js';
import { alertRouter } from './routes/alert.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { consentRouter } from './routes/consent.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { securityRouter } from './routes/security.routes.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

export const app = express();

// Security HTTP headers (HSTS, X-Content-Type-Options, Frameguard)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Cross-Origin Resource Sharing with Credentials
app.use(
  cors({
    origin: [config.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// General API Rate Limiting (DDoS & Brute Force Protection)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // Max 3000 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP address. Please retry after 15 minutes.',
    },
  },
});
app.use('/api', apiLimiter);

// Cookie Parser for HttpOnly Refresh Tokens
app.use(cookieParser());

// Request Logging
app.use(morgan(config.isDev ? 'dev' : 'combined'));

// Body Parsers with size boundary to prevent memory exhaustion
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    project: 'Privacy-Aware Remote Patient Monitoring System using Edge Computing and IoMT',
    stage: 'Stage 7: Privacy & Security Implementation',
    status: 'online',
    encryption: 'AES-256-GCM',
    differentialPrivacy: 'Active (ε=0.5, δ=1e-5)',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      patients: '/api/patients',
      devices: '/api/devices',
      vitals: '/api/vitals',
      alerts: '/api/alerts',
      analytics: '/api/analytics',
      consent: '/api/consent',
      audit: '/api/audit',
      security: '/api/security/overview',
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
app.use('/api/consent', consentRouter);
app.use('/api/audit', auditRouter);
app.use('/api/security', securityRouter);

// 404 & Centralized Error Handling
app.use(notFoundHandler);
app.use(errorHandler);
