import { Router } from 'express';
import { getSimulatorStatus, forwardSimulatorAction } from '../controllers/simulator.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const simulatorRouter = Router();

// Staff authentication required to control simulator
simulatorRouter.use(authenticateToken);

// Status check
simulatorRouter.get('/status', getSimulatorStatus);

// All commands forwarded to edge node
simulatorRouter.post('/start-all', forwardSimulatorAction);
simulatorRouter.post('/stop-all', forwardSimulatorAction);
simulatorRouter.post('/device/:code/start', forwardSimulatorAction);
simulatorRouter.post('/device/:code/stop', forwardSimulatorAction);
simulatorRouter.post('/device/:code/scenario', forwardSimulatorAction);
simulatorRouter.post('/device/:code/interval', forwardSimulatorAction);
