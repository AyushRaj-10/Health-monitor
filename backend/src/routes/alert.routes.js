import { Router } from 'express';
import {
  ingestAlert,
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
} from '../controllers/alert.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const alertRouter = Router();

// Ingestion endpoint (invoked directly by edge node / hardware)
alertRouter.post('/ingest', ingestAlert);
alertRouter.post('/', ingestAlert);

// Protected routes for clinical staff review
alertRouter.use(authenticateToken);

alertRouter.get('/', getAlerts);
alertRouter.patch('/:id/acknowledge', acknowledgeAlert);
alertRouter.patch('/:id/resolve', resolveAlert);
