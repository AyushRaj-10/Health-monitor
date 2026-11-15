import { Router } from 'express';
import {
  ingestVitals,
  getPatientVitals,
  getLatestPatientVitals,
} from '../controllers/vitals.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const vitalsRouter = Router();

// Device ingestion endpoint (Hardware/Simulator authenticates via device apiKey inside request payload)
vitalsRouter.post('/ingest', ingestVitals);

// Clinical staff query endpoints (Require Bearer JWT authentication)
vitalsRouter.get('/patients/:id/vitals', authenticateToken, getPatientVitals);
vitalsRouter.get('/patients/:id/vitals/latest', authenticateToken, getLatestPatientVitals);
