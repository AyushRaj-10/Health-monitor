import { prisma } from '../config/prisma.js';
import { emitNewAlert, emitAlertUpdate } from '../services/socket.service.js';
import { recordAuditLog } from '../services/audit.service.js';

/**
 * POST /api/alerts/ingest (and POST /api/alerts)
 * Ingests an anomaly alert generated locally at the IoMT Edge gateway or simulated device.
 */
export async function ingestAlert(req, res, next) {
  try {
    const {
      patientId,
      deviceId,
      vitalType,
      alertType,
      severity = 'WARNING',
      message,
      source = 'EDGE_GATEWAY',
      currentValue,
      thresholdValue,
      triggeredAt,
      createdAt,
    } = req.body;

    const resolvedVitalType = vitalType || alertType || 'VITAL_ANOMALY';
    const resolvedAlertType = alertType || vitalType || 'VITAL_ANOMALY';

    if (!patientId || !message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MALFORMED_ALERT',
          message: 'Alert ingestion requires patientId and message.',
        },
      });
    }

    // Check patient existence
    const patient = await prisma.patient.findFirst({
      where: { OR: [{ id: patientId }, { patientCode: patientId }] },
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

    // Resolve optional device
    let resolvedDeviceId = null;
    if (deviceId) {
      const dev = await prisma.device.findFirst({
        where: { OR: [{ id: deviceId }, { deviceCode: deviceId }] },
      });
      if (dev) resolvedDeviceId = dev.id;
    }

    const eventTime = triggeredAt ? new Date(triggeredAt) : createdAt ? new Date(createdAt) : new Date();

    const alert = await prisma.alert.create({
      data: {
        patientId: patient.id,
        deviceId: resolvedDeviceId,
        vitalType: resolvedVitalType,
        alertType: resolvedAlertType,
        severity: ['CRITICAL', 'WARNING', 'INFO'].includes(severity) ? severity : 'WARNING',
        message,
        source,
        status: 'OPEN',
        isAcknowledged: false,
        isResolved: false,
        currentValue: currentValue !== undefined ? String(currentValue) : null,
        thresholdValue: thresholdValue !== undefined ? String(thresholdValue) : null,
        triggeredAt: eventTime,
        createdAt: eventTime,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            patientCode: true,
            riskLevel: true,
            roomOrLocation: true,
            assignedDoctorId: true,
          },
        },
        device: {
          select: {
            id: true,
            deviceCode: true,
            name: true,
            deviceType: true,
          },
        },
      },
    });

    // Broadcast real-time alert event (strictly after database persistence)
    emitNewAlert(patient.id, alert);

    res.status(201).json({
      success: true,
      message: 'Alert ingested and persisted successfully.',
      data: alert,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/alerts
 * Lists alerts with multi-dimensional filtering by severity, status, patient, date range, device, and source.
 */
export async function getAlerts(req, res, next) {
  try {
    const {
      severity,
      status,
      isResolved,
      patientId,
      deviceId,
      source,
      startDate,
      endDate,
      limit = 50,
      page = 1,
    } = req.query;

    const where = {};

    if (severity && ['CRITICAL', 'WARNING', 'INFO'].includes(severity)) {
      where.severity = severity;
    }

    if (status && ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].includes(status)) {
      where.status = status;
    } else if (isResolved !== undefined) {
      where.status = isResolved === 'true' ? 'RESOLVED' : { not: 'RESOLVED' };
    }

    if (patientId) {
      // Allow patient UUID or patientCode
      const patient = await prisma.patient.findFirst({
        where: { OR: [{ id: patientId }, { patientCode: patientId }] },
        select: { id: true },
      });
      where.patientId = patient ? patient.id : patientId;
    }

    if (deviceId) {
      const dev = await prisma.device.findFirst({
        where: { OR: [{ id: deviceId }, { deviceCode: deviceId }] },
        select: { id: true },
      });
      where.deviceId = dev ? dev.id : deviceId;
    }

    if (source) {
      where.source = source;
    }

    // Date Range Filtering on triggeredAt (with fallback to createdAt)
    if (startDate || endDate) {
      where.triggeredAt = {};
      if (startDate) {
        where.triggeredAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.triggeredAt.lte = new Date(endDate);
      }
    }

    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * take;

    const [alerts, total, openCount, acknowledgedCount, resolvedCount, criticalCount] = await Promise.all([
      prisma.alert.findMany({
        where,
        take,
        skip,
        orderBy: { triggeredAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              patientCode: true,
              riskLevel: true,
              roomOrLocation: true,
              assignedDoctor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          device: {
            select: {
              id: true,
              deviceCode: true,
              name: true,
              deviceType: true,
              batteryLevel: true,
            },
          },
        },
      }),
      prisma.alert.count({ where }),
      prisma.alert.count({ where: { ...where, status: 'OPEN' } }),
      prisma.alert.count({ where: { ...where, status: 'ACKNOWLEDGED' } }),
      prisma.alert.count({ where: { ...where, status: 'RESOLVED' } }),
      prisma.alert.count({ where: { ...where, severity: 'CRITICAL', status: { not: 'RESOLVED' } } }),
    ]);

    res.status(200).json({
      success: true,
      data: alerts,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
        openCount,
        acknowledgedCount,
        resolvedCount,
        criticalCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/alerts/:id
 * Retrieves detail view of a single clinical alert.
 */
export async function getAlertById(req, res, next) {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            patientCode: true,
            gender: true,
            dateOfBirth: true,
            riskLevel: true,
            roomOrLocation: true,
            assignedDoctor: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
              },
            },
          },
        },
        device: {
          select: {
            id: true,
            deviceCode: true,
            name: true,
            deviceType: true,
            status: true,
            batteryLevel: true,
            lastHeartbeat: true,
          },
        },
      },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ALERT_NOT_FOUND',
          message: `Alert with ID "${id}" was not found.`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/alerts/:id/acknowledge
 * Transitions alert to ACKNOWLEDGED state.
 */
export async function acknowledgeAlert(req, res, next) {
  try {
    const { id } = req.params;
    const actorName = req.user?.name || req.user?.email || 'Authorized Staff';

    const existingAlert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!existingAlert) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ALERT_NOT_FOUND',
          message: `Alert with ID "${id}" was not found.`,
        },
      });
    }

    const alert = await prisma.alert.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        isAcknowledged: true,
        acknowledgedBy: actorName,
        acknowledgedAt: new Date(),
      },
      include: {
        patient: { select: { id: true, name: true, patientCode: true } },
        device: { select: { id: true, deviceCode: true, name: true } },
      },
    });

    // Broadcast real-time alert update event
    emitAlertUpdate(alert.patientId, alert);

    if (req.user) {
      recordAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'ALERT_ACKNOWLEDGE',
        resourceType: 'Alert',
        resourceId: alert.id,
        metadata: {
          patientId: alert.patientId,
          patientCode: alert.patient?.patientCode,
          severity: alert.severity,
        },
        ipAddress: req.ip,
        status: 'SUCCESS',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alert acknowledged successfully.',
      data: alert,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/alerts/:id/resolve
 * Transitions alert to RESOLVED state with resolution notes.
 */
export async function resolveAlert(req, res, next) {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body || {};
    const actorName = req.user?.name || req.user?.email || 'Authorized Staff';

    const existingAlert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!existingAlert) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ALERT_NOT_FOUND',
          message: `Alert with ID "${id}" was not found.`,
        },
      });
    }

    const alert = await prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        isResolved: true,
        resolvedBy: actorName,
        resolvedAt: new Date(),
        resolutionNotes: resolutionNotes ? String(resolutionNotes).trim() : existingAlert.resolutionNotes,
      },
      include: {
        patient: { select: { id: true, name: true, patientCode: true } },
        device: { select: { id: true, deviceCode: true, name: true } },
      },
    });

    // Broadcast real-time alert update event
    emitAlertUpdate(alert.patientId, alert);

    if (req.user) {
      recordAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'ALERT_RESOLVE',
        resourceType: 'Alert',
        resourceId: alert.id,
        metadata: {
          patientId: alert.patientId,
          patientCode: alert.patient?.patientCode,
          severity: alert.severity,
          hasResolutionNotes: !!resolutionNotes,
        },
        ipAddress: req.ip,
        status: 'SUCCESS',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alert resolved successfully.',
      data: alert,
    });
  } catch (error) {
    next(error);
  }
}
