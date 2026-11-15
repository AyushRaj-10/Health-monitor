import { prisma } from '../config/prisma.js';

/**
 * POST /api/alerts/ingest
 * Ingests an anomaly alert generated locally at the IoMT Edge gateway.
 */
export async function ingestAlert(req, res, next) {
  try {
    const {
      patientId,
      deviceId,
      vitalType,
      severity = 'WARNING',
      message,
      currentValue,
      thresholdValue,
      createdAt,
    } = req.body;

    if (!patientId || !vitalType || !message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MALFORMED_ALERT',
          message: 'Alert ingestion requires patientId, vitalType, and message.',
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

    const alert = await prisma.alert.create({
      data: {
        patientId: patient.id,
        deviceId: resolvedDeviceId,
        vitalType,
        severity: ['CRITICAL', 'WARNING', 'INFO'].includes(severity) ? severity : 'WARNING',
        message,
        currentValue: currentValue !== undefined ? String(currentValue) : null,
        thresholdValue: thresholdValue !== undefined ? String(thresholdValue) : null,
        createdAt: createdAt ? new Date(createdAt) : new Date(),
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            patientCode: true,
            riskLevel: true,
          },
        },
        device: {
          select: {
            id: true,
            deviceCode: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Local edge alert ingested and persisted successfully.',
      data: alert,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/alerts
 * Lists alerts with filtering by severity, resolution status, and patient.
 */
export async function getAlerts(req, res, next) {
  try {
    const { severity, isResolved, patientId, limit = 50, page = 1 } = req.query;

    const where = {};

    if (severity && ['CRITICAL', 'WARNING', 'INFO'].includes(severity)) {
      where.severity = severity;
    }

    if (isResolved !== undefined) {
      where.isResolved = isResolved === 'true';
    }

    if (patientId) {
      where.patientId = patientId;
    }

    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * take;

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              patientCode: true,
              riskLevel: true,
              roomOrLocation: true,
            },
          },
          device: {
            select: {
              id: true,
              deviceCode: true,
              name: true,
            },
          },
        },
      }),
      prisma.alert.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: alerts,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take),
        unresolvedCount: await prisma.alert.count({ where: { isResolved: false } }),
        criticalCount: await prisma.alert.count({ where: { severity: 'CRITICAL', isResolved: false } }),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/alerts/:id/acknowledge
 */
export async function acknowledgeAlert(req, res, next) {
  try {
    const { id } = req.params;
    const actorName = req.user?.name || 'Authorized Staff';

    const alert = await prisma.alert.update({
      where: { id },
      data: {
        isAcknowledged: true,
        acknowledgedBy: actorName,
        acknowledgedAt: new Date(),
      },
      include: {
        patient: { select: { id: true, name: true, patientCode: true } },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Alert acknowledged.',
      data: alert,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/alerts/:id/resolve
 */
export async function resolveAlert(req, res, next) {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
      include: {
        patient: { select: { id: true, name: true, patientCode: true } },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Alert resolved.',
      data: alert,
    });
  } catch (error) {
    next(error);
  }
}
