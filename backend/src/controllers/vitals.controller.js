import { prisma } from '../config/prisma.js';
import { ingestVitalsSchema } from '../validations/vitals.validation.js';
import { emitVitalsUpdate, emitDeviceStatus } from '../services/socket.service.js';

/**
 * POST /api/vitals/ingest
 * Ingestion endpoint called by the IoMT edge simulator / wearable device.
 * Validates device identity, patient authorization, physiological boundaries, and stores readings.
 */
export async function ingestVitals(req, res, next) {
  try {
    const parseResult = ingestVitalsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MALFORMED_READING',
          message: parseResult.error.errors[0]?.message || 'Vital reading payload failed physiological boundary validation',
          details: parseResult.error.errors,
        },
      });
    }

    const payload = parseResult.data;

    // 1. Authenticate Device via ID or deviceCode and apiKey
    const device = await prisma.device.findFirst({
      where: {
        OR: [{ id: payload.deviceId }, { deviceCode: payload.deviceId }],
      },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: `Unrecognized IoMT device identifier: "${payload.deviceId}".`,
        },
      });
    }

    // Verify secret API key
    if (device.apiKey !== payload.apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_DEVICE_CREDENTIALS',
          message: 'Device authentication failed. Invalid API key.',
        },
      });
    }

    // 2. Identify Patient
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [{ id: payload.patientId }, { patientCode: payload.patientId }],
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `Target patient identifier "${payload.patientId}" was not found.`,
        },
      });
    }

    // 3. Security Check: Validate Device-Patient Authorization
    // Never allow a simulator or compromised device to submit readings for unauthorized patients
    if (device.patientId !== patient.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED_PATIENT_ASSOCIATION',
          message: `Security rejection: Device "${device.deviceCode}" is not authorized or provisioned for patient "${patient.patientCode}".`,
        },
      });
    }

    // 4. Construct readings array (handle both single object & batch readings)
    const readingsToInsert = [];

    if (payload.readings && payload.readings.length > 0) {
      for (const r of payload.readings) {
        readingsToInsert.push({
          patientId: patient.id,
          deviceId: device.id,
          heartRate: r.heartRate,
          spo2: r.spo2,
          bloodPressureSys: r.bloodPressureSys,
          bloodPressureDia: r.bloodPressureDia,
          temperature: r.temperature,
          respiratoryRate: r.respiratoryRate ?? null,
          isSimulated: r.isSimulated ?? true,
          scenario: r.scenario || 'NORMAL',
          recordedAt: r.recordedAt ? new Date(r.recordedAt) : new Date(),
        });
      }
    } else {
      readingsToInsert.push({
        patientId: patient.id,
        deviceId: device.id,
        heartRate: payload.heartRate,
        spo2: payload.spo2,
        bloodPressureSys: payload.bloodPressureSys,
        bloodPressureDia: payload.bloodPressureDia,
        temperature: payload.temperature,
        respiratoryRate: payload.respiratoryRate ?? null,
        isSimulated: payload.isSimulated ?? true,
        scenario: payload.scenario || 'NORMAL',
        recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : new Date(),
      });
    }

    // 5. Persist readings into PostgreSQL
    await prisma.vitalReading.createMany({
      data: readingsToInsert,
    });

    // 6. Update device heartbeat and status
    await prisma.device.update({
      where: { id: device.id },
      data: {
        lastHeartbeat: new Date(),
        status: 'ONLINE',
      },
    });

    // 7. Emit real-time WebSocket event to authorized patient room (strictly after persistence)
    const latestReading = readingsToInsert[readingsToInsert.length - 1];
    emitVitalsUpdate(patient.id, {
      reading: latestReading,
      patient: {
        id: patient.id,
        name: patient.name,
        patientCode: patient.patientCode,
        riskLevel: patient.riskLevel,
      },
      device: {
        id: device.id,
        deviceCode: device.deviceCode,
        name: device.name,
        deviceType: device.deviceType,
      },
    });

    emitDeviceStatus(device.id, patient.id, {
      status: 'ONLINE',
      batteryLevel: device.batteryLevel,
      lastHeartbeat: new Date(),
    });

    res.status(201).json({
      success: true,
      message: `Successfully ingested ${readingsToInsert.length} vital reading(s).`,
      data: {
        count: readingsToInsert.length,
        deviceId: device.deviceCode,
        patientCode: patient.patientCode,
        latestReading: readingsToInsert[readingsToInsert.length - 1],
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/patients/:id/vitals
 * Returns historical vital readings for a patient
 */
export async function getPatientVitals(req, res, next) {
  try {
    const { id } = req.params;
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const { startTime, endTime, scenario } = req.query;

    // Verify patient exists
    const patient = await prisma.patient.findFirst({
      where: { OR: [{ id }, { patientCode: id }] },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `No patient found with ID: ${id}`,
        },
      });
    }

    const where = { patientId: patient.id };

    if (scenario) {
      where.scenario = scenario;
    }

    if (startTime || endTime) {
      where.recordedAt = {};
      if (startTime) where.recordedAt.gte = new Date(startTime);
      if (endTime) where.recordedAt.lte = new Date(endTime);
    }

    const [total, readings] = await Promise.all([
      prisma.vitalReading.count({ where }),
      prisma.vitalReading.findMany({
        where,
        take: limit,
        orderBy: { recordedAt: 'desc' },
        include: {
          device: {
            select: {
              deviceCode: true,
              name: true,
              deviceType: true,
            },
          },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: readings,
      count: readings.length,
      total,
      patient: {
        id: patient.id,
        name: patient.name,
        patientCode: patient.patientCode,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/patients/:id/vitals/latest
 * Returns the most recent physiological reading for a patient
 */
export async function getLatestPatientVitals(req, res, next) {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findFirst({
      where: { OR: [{ id }, { patientCode: id }] },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `No patient found with ID: ${id}`,
        },
      });
    }

    const latest = await prisma.vitalReading.findFirst({
      where: { patientId: patient.id },
      orderBy: { recordedAt: 'desc' },
      include: {
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

    res.status(200).json({
      success: true,
      data: latest,
      patient: {
        id: patient.id,
        name: patient.name,
        patientCode: patient.patientCode,
      },
    });
  } catch (error) {
    next(error);
  }
}
