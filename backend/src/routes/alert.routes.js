import { Router } from 'express';
import {
  ingestAlert,
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
} from '../controllers/alert.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const alertRouter = Router();

// Ingestion endpoints (invoked directly by edge node / simulated devices)
alertRouter.post('/ingest', ingestAlert);
alertRouter.post('/', ingestAlert);

// Protected routes for clinical staff review and lifecycle mutations
alertRouter.use(authenticateToken);

alertRouter.get('/', getAlerts);
alertRouter.get('/:id', getAlertById);
alertRouter.patch('/:id/acknowledge', acknowledgeAlert);
alertRouter.patch('/:id/resolve', resolveAlert);
