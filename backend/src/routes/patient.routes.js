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
import {
  authenticateToken,
  requirePermission,
  authorizePatientAccess,
} from '../middlewares/auth.middleware.js';
import { PERMISSIONS } from '../config/permissions.js';

export const patientRouter = Router();

// All patient endpoints require authenticated session
patientRouter.use(authenticateToken);

// Patient CRUD routes
patientRouter.get('/', requirePermission(PERMISSIONS.PATIENTS_VIEW), getPatients);
patientRouter.post('/', requirePermission(PERMISSIONS.PATIENTS_CREATE), createPatient);
patientRouter.get('/:id', requirePermission(PERMISSIONS.PATIENTS_VIEW), authorizePatientAccess, getPatientById);
patientRouter.patch('/:id', requirePermission(PERMISSIONS.PATIENTS_UPDATE), authorizePatientAccess, updatePatient);
patientRouter.delete('/:id', requirePermission(PERMISSIONS.PATIENTS_DELETE), deletePatient);

// Patient vitals endpoints
patientRouter.get('/:id/vitals', requirePermission(PERMISSIONS.VITALS_VIEW), authorizePatientAccess, getPatientVitals);
patientRouter.get('/:id/vitals/latest', requirePermission(PERMISSIONS.VITALS_VIEW), authorizePatientAccess, getLatestPatientVitals);
