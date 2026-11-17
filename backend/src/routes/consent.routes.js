import { Router } from 'express';
import {
  createConsent,
  getConsents,
  getPatientConsents,
  revokeConsent,
  getConsentPurposes,
} from '../controllers/consent.controller.js';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware.js';
import { PERMISSIONS } from '../config/permissions.js';

export const consentRouter = Router();

consentRouter.use(authenticateToken);

// Read Consent Purposes
consentRouter.get('/purposes', getConsentPurposes);

// List Consents
consentRouter.get('/', requirePermission(PERMISSIONS.CONSENT_VIEW), getConsents);

// Patient Specific Consents
consentRouter.get('/patient/:patientId', requirePermission(PERMISSIONS.CONSENT_VIEW), getPatientConsents);

// Create Consent
consentRouter.post('/', requirePermission(PERMISSIONS.CONSENT_MANAGE), createConsent);

// Revoke Consent
consentRouter.patch('/:id/revoke', requirePermission(PERMISSIONS.CONSENT_MANAGE), revokeConsent);
