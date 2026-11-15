import { Router } from 'express';
import { getSimulatorStatus, forwardSimulatorAction } from '../controllers/simulator.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const simulatorRouter = Router();

// Staff authentication required to control simulator
simulatorRouter.use(authenticateToken);

// Status & Metrics checks
simulatorRouter.get('/status', getSimulatorStatus);
simulatorRouter.get('/metrics', forwardSimulatorAction);
simulatorRouter.get('/threshold-profiles', forwardSimulatorAction);

// Global & Per-Device Controls
simulatorRouter.post('/start-all', forwardSimulatorAction);
simulatorRouter.post('/stop-all', forwardSimulatorAction);
simulatorRouter.post('/policy', forwardSimulatorAction);
simulatorRouter.post('/network-toggle', forwardSimulatorAction);
simulatorRouter.post('/thresholds', forwardSimulatorAction);
simulatorRouter.post('/sync-offline', forwardSimulatorAction);

simulatorRouter.post('/device/:code/start', forwardSimulatorAction);
simulatorRouter.post('/device/:code/stop', forwardSimulatorAction);
simulatorRouter.post('/device/:code/scenario', forwardSimulatorAction);
simulatorRouter.post('/device/:code/interval', forwardSimulatorAction);
