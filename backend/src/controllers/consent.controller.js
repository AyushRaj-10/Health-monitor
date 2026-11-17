import { prisma } from '../config/prisma.js';
import { recordAuditLog } from '../services/audit.service.js';

/**
 * POST /api/consent
 * Creates / grants a patient data access consent record.
 */
export async function createConsent(req, res, next) {
  try {
    const {
      patientId,
      purpose = 'REMOTE_MONITORING',
      grantedBy,
      expiresAt,
      authorizedRoles = ['DOCTOR', 'NURSE', 'ADMIN'],
      authorizedPurposes = ['REMOTE_MONITORING', 'EMERGENCY_CARE'],
      notes,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MALFORMED_REQUEST',
          message: 'patientId is required to establish patient consent.',
        },
      });
    }

    const patient = await prisma.patient.findFirst({
      where: { OR: [{ id: patientId }, { patientCode: patientId }] },
      select: { id: true, patientCode: true, name: true },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `Target patient "${patientId}" was not found.`,
        },
      });
    }

    const consent = await prisma.patientConsent.create({
      data: {
        patientId: patient.id,
        purpose,
        status: 'GRANTED',
        grantedBy: grantedBy || `${patient.name} (Patient Self)`,
        grantedAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        authorizedRoles,
        authorizedPurposes,
        notes: notes || 'Standard IoMT biometric collection and continuous alerting consent.',
      },
      include: {
        patient: { select: { id: true, patientCode: true, name: true } },
      },
    });

    // Record Immutable Audit Log Entry
    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'CONSENT_GRANT',
      resourceType: 'PatientConsent',
      resourceId: consent.id,
      metadata: {
        patientId: patient.id,
        patientCode: patient.patientCode,
        purpose: consent.purpose,
        grantedBy: consent.grantedBy,
      },
      ipAddress: req.ip,
      status: 'SUCCESS',
    });

    res.status(201).json({
      success: true,
      message: 'Patient consent established successfully.',
      data: consent,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/consent
 * Retrieves consent records with multi-attribute filtering.
 */
export async function getConsents(req, res, next) {
  try {
    const { patientId, status, purpose, limit = 50, page = 1 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (purpose) where.purpose = purpose;

    if (patientId) {
      const patient = await prisma.patient.findFirst({
        where: { OR: [{ id: patientId }, { patientCode: patientId }] },
        select: { id: true },
      });
      where.patientId = patient ? patient.id : patientId;
    }

    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * take;

    const [consents, total, activeCount, revokedCount] = await Promise.all([
      prisma.patientConsent.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              patientCode: true,
              name: true,
              riskLevel: true,
            },
          },
        },
      }),
      prisma.patientConsent.count({ where }),
      prisma.patientConsent.count({ where: { ...where, status: 'GRANTED' } }),
      prisma.patientConsent.count({ where: { ...where, status: 'REVOKED' } }),
    ]);

    res.status(200).json({
      success: true,
      data: consents,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
        activeCount,
        revokedCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/consent/patient/:patientId
 * Retrieves full consent history for an individual patient.
 */
export async function getPatientConsents(req, res, next) {
  try {
    const { patientId } = req.params;

    const patient = await prisma.patient.findFirst({
      where: { OR: [{ id: patientId }, { patientCode: patientId }] },
      select: { id: true, patientCode: true, name: true },
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

    const consents = await prisma.patientConsent.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: {
        patient,
        consents,
        activeConsent: consents.find((c) => c.status === 'GRANTED') || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/consent/:id/revoke
 * Revokes a patient consent record.
 */
export async function revokeConsent(req, res, next) {
  try {
    const { id } = req.params;
    const { revocationReason = 'Clinical consent withdrawn by patient or guardian.' } = req.body || {};
    const actorName = req.user?.name || req.user?.email || 'Authorized Staff';

    const existing = await prisma.patientConsent.findUnique({
      where: { id },
      include: { patient: { select: { id: true, patientCode: true, name: true } } },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONSENT_NOT_FOUND',
          message: `Consent record "${id}" was not found.`,
        },
      });
    }

    const updatedConsent = await prisma.patientConsent.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy: actorName,
        revocationReason: String(revocationReason).trim(),
      },
    });

    // Record Immutable Audit Log Entry
    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'CONSENT_REVOKE',
      resourceType: 'PatientConsent',
      resourceId: updatedConsent.id,
      metadata: {
        patientId: existing.patientId,
        patientCode: existing.patient?.patientCode,
        revokedBy: actorName,
        reason: revocationReason,
      },
      ipAddress: req.ip,
      status: 'SUCCESS',
    });

    res.status(200).json({
      success: true,
      message: 'Patient consent revoked successfully.',
      data: updatedConsent,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/consent/purposes
 * Returns supported clinical and technical consent purposes and legal disclaimers.
 */
export function getConsentPurposes(req, res) {
  res.status(200).json({
    success: true,
    data: {
      purposes: [
        {
          code: 'REMOTE_MONITORING',
          title: 'Remote IoMT Biometric Monitoring',
          description: 'Continuous continuous physiological telemetry collection, edge anomaly filtering, and real-time physician alerting.',
        },
        {
          code: 'EMERGENCY_CARE',
          title: 'Emergency Medical Care Override',
          description: 'Allows unassigned hospital physicians and critical triage nurses emergency break-glass access during acute physiological decompensation.',
        },
        {
          code: 'CLINICAL_RESEARCH',
          title: 'De-Identified Clinical Research',
          description: 'Population aggregation using Differential Privacy (Laplace mechanism) for academic cardiac telemetry research.',
        },
        {
          code: 'TELEMETRY_INGESTION',
          title: 'Edge Sensor Gateway Ingestion',
          description: 'Authorizes local wearable edge gateways to process raw biosensor packets.',
        },
      ],
      legalDisclaimer:
        'Patient consent is an operational trust instrument and does not substitute for statutory healthcare requirements, clinical supervision duties, or HIPAA / GDPR technical safeguard standards.',
    },
  });
}
