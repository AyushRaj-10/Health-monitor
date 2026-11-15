import { Router } from 'express';
import {
  getAnalyticsOverview,
  getPatientAnalytics,
  getPatientVitalsAnalytics,
} from '../controllers/analytics.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const analyticsRouter = Router();

// Protected analytics endpoints
analyticsRouter.use(authenticateToken);

// GET /api/analytics/overview
analyticsRouter.get('/overview', getAnalyticsOverview);

// GET /api/analytics/patients/:id
analyticsRouter.get('/patients/:id', getPatientAnalytics);

// GET /api/analytics/vitals/:patientId
analyticsRouter.get('/vitals/:patientId', getPatientVitalsAnalytics);
