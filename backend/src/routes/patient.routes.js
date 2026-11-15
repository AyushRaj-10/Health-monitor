import { Router } from 'express';
import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
} from '../controllers/patient.controller.js';
import {
  getPatientVitals,
  getLatestPatientVitals,
} from '../controllers/vitals.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

export const patientRouter = Router();

// All patient endpoints require authenticated session
patientRouter.use(authenticateToken);

// Patient CRUD routes
patientRouter.post('/', requireRole('ADMIN', 'DOCTOR', 'NURSE'), createPatient);
patientRouter.get('/', getPatients);
patientRouter.get('/:id', getPatientById);
patientRouter.patch('/:id', requireRole('ADMIN', 'DOCTOR', 'NURSE'), updatePatient);
patientRouter.delete('/:id', deletePatient);

// Patient vitals endpoints
patientRouter.get('/:id/vitals', getPatientVitals);
patientRouter.get('/:id/vitals/latest', getLatestPatientVitals);
