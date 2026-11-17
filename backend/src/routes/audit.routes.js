import { Router } from 'express';
import { getAuditLogs, getAuditLogById } from '../controllers/audit.controller.js';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware.js';
import { PERMISSIONS } from '../config/permissions.js';

export const auditRouter = Router();

// Strictly protected audit routes
auditRouter.use(authenticateToken);
auditRouter.use(requirePermission(PERMISSIONS.AUDIT_VIEW));

// GET /api/audit
auditRouter.get('/', getAuditLogs);

// GET /api/audit/:id
auditRouter.get('/:id', getAuditLogById);

// NOTE: No DELETE, PUT, or PATCH endpoints are implemented.
// Audit logs are strictly immutable and append-only.
