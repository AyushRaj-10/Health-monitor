import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { hasPermission } from '../config/permissions.js';
import { recordAuditLog } from '../services/audit.service.js';

/**
 * Authentication Middleware: Validates Bearer Access Token
 */
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please provide a valid Bearer token.',
        },
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtAccessSecret, {
        issuer: 'iomt-rpm-auth',
        audience: 'iomt-rpm-client',
      });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Access token expired. Please refresh your session.',
          },
        });
      }
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or forged authentication token.',
        },
      });
    }

    // Check user in database to ensure user is active and role hasn't changed
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        department: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'The user account associated with this token is inactive or no longer exists.',
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-Based Authorization Middleware
 * @param  {...string} allowedRoles (e.g. 'ADMIN', 'DOCTOR', 'NURSE')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      recordAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        resourceType: 'API_ENDPOINT',
        resourceId: req.originalUrl,
        metadata: { requiredRoles: allowedRoles, reason: 'INSUFFICIENT_ROLE' },
        ipAddress: req.ip,
        status: 'DENIED',
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}].`,
        },
      });
    }

    next();
  };
}

/**
 * Granular Permission Middleware
 * Verifies that the user role possesses the fine-grained capability.
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      recordAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        resourceType: 'PERMISSION',
        resourceId: permission,
        metadata: { path: req.originalUrl, requiredPermission: permission },
        ipAddress: req.ip,
        status: 'DENIED',
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_PERMISSION',
          message: `Access denied: You lack the required permission [${permission}].`,
        },
      });
    }

    next();
  };
}

/**
 * Patient-Specific Access Authorization Middleware
 * Ensures doctors can only access authorized patient records (assigned, or emergency consent override).
 * Nurses and Administrators have ward-level or system-level authorized access.
 */
export async function authorizePatientAccess(req, res, next) {
  try {
    const patientId = req.params.id || req.params.patientId || req.query.patientId;

    if (!patientId) {
      return next();
    }

    // Resolve patient by ID or patientCode
    const patient = await prisma.patient.findFirst({
      where: { OR: [{ id: patientId }, { patientCode: patientId }] },
      select: {
        id: true,
        patientCode: true,
        name: true,
        assignedDoctorId: true,
        status: true,
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `Patient "${patientId}" was not found.`,
        },
      });
    }

    // Attach patient to request
    req.targetPatient = patient;

    // ADMIN has universal access
    if (req.user.role === 'ADMIN') {
      req.isAssignedDoctor = false;
      return next();
    }

    // NURSE has ward monitoring access
    if (req.user.role === 'NURSE') {
      req.isAssignedDoctor = false;
      return next();
    }

    // DOCTOR checks
    if (req.user.role === 'DOCTOR') {
      const isAssigned = patient.assignedDoctorId === req.user.id;
      const isUnassignedWardBed = !patient.assignedDoctorId;

      if (isAssigned || isUnassignedWardBed) {
        req.isAssignedDoctor = isAssigned;
        return next();
      }

      // Check if patient granted explicit EMERGENCY_CARE consent
      const emergencyConsent = await prisma.patientConsent.findFirst({
        where: {
          patientId: patient.id,
          status: 'GRANTED',
          purpose: 'EMERGENCY_CARE',
        },
      });

      if (emergencyConsent) {
        req.isAssignedDoctor = false;
        req.isEmergencyConsentAccess = true;
        return next();
      }

      // Unauthorized Doctor access attempt -> Log audit entry and deny
      recordAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        resourceType: 'Patient',
        resourceId: patient.id,
        metadata: {
          patientCode: patient.patientCode,
          assignedDoctorId: patient.assignedDoctorId,
          reason: 'DOCTOR_NOT_ASSIGNED',
        },
        ipAddress: req.ip,
        status: 'DENIED',
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED_PATIENT_ACCESS',
          message: `Access denied: You are not the assigned physician for patient ${patient.patientCode} and no emergency consent is on record.`,
        },
      });
    }

    return next();
  } catch (error) {
    next(error);
  }
}
