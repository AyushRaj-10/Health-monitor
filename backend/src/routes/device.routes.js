import { Router } from 'express';
import {
  createDevice,
  getDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  recordHeartbeat,
} from '../controllers/device.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

export const deviceRouter = Router();

// Heartbeat endpoint can be called by hardware/simulator directly
deviceRouter.post('/:id/heartbeat', recordHeartbeat);

// Protected routes for clinical staff
deviceRouter.use(authenticateToken);

deviceRouter.post('/', requireRole('ADMIN', 'DOCTOR', 'NURSE'), createDevice);
deviceRouter.get('/', getDevices);
deviceRouter.get('/:id', getDeviceById);
deviceRouter.patch('/:id', requireRole('ADMIN', 'DOCTOR'), updateDevice);
deviceRouter.delete('/:id', requireRole('ADMIN'), deleteDevice);
