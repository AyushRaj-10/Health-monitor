import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { emitDeviceStatus } from '../services/socket.service.js';
import {
  createDeviceSchema,
  updateDeviceSchema,
  heartbeatSchema,
} from '../validations/device.validation.js';

/**
 * POST /api/devices
 * Registers a new IoMT device
 */
export async function createDevice(req, res, next) {
  try {
    const parseResult = createDeviceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid device registration data',
          details: parseResult.error.errors,
        },
      });
    }

    const {
      deviceCode,
      name,
      deviceType,
      patientId,
      batteryLevel,
      firmwareVersion,
      edgeNodeId,
      apiKey,
      isSimulated,
    } = parseResult.data;

    // Check if deviceCode already registered
    const existing = await prisma.device.findUnique({
      where: { deviceCode: deviceCode.trim() },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DEVICE_CODE_EXISTS',
          message: `Device with code "${deviceCode}" is already registered.`,
        },
      });
    }

    // Verify patient if provided
    if (patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
      });
      if (!patient) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: `Cannot associate device. Patient with ID "${patientId}" does not exist.`,
          },
        });
      }
    }

    // Generate random API key if not supplied
    const generatedApiKey = apiKey || `dev_key_${crypto.randomBytes(16).toString('hex')}`;

    const newDevice = await prisma.device.create({
      data: {
        deviceCode: deviceCode.trim(),
        name: name.trim(),
        deviceType,
        patientId: patientId || null,
        batteryLevel: batteryLevel ?? 100,
        firmwareVersion: firmwareVersion || 'v2.4.1-sim',
        edgeNodeId: edgeNodeId || 'EDGE-GATEWAY-RPI4-01',
        apiKey: generatedApiKey,
        isSimulated: isSimulated ?? true,
        status: 'ONLINE',
        lastHeartbeat: new Date(),
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            patientCode: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'IoMT device registered successfully.',
      data: newDevice,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/devices
 * Lists all registered devices with patient association and heartbeat status
 */
export async function getDevices(req, res, next) {
  try {
    const { status, deviceType, patientId, search } = req.query;

    const where = {};

    if (status && ['ONLINE', 'OFFLINE', 'DEGRADED'].includes(status)) {
      where.status = status;
    }

    if (deviceType) {
      where.deviceType = deviceType;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (search) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { deviceCode: { contains: term, mode: 'insensitive' } },
      ];
    }

    const devices = await prisma.device.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            patientCode: true,
            riskLevel: true,
          },
        },
        _count: {
          select: { readings: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: devices,
      count: devices.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/devices/:id
 * Retrieves single device details, assigned patient, and recent vitals
 */
export async function getDeviceById(req, res, next) {
  try {
    const { id } = req.params;

    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            patientCode: true,
            condition: true,
            riskLevel: true,
          },
        },
        readings: {
          take: 10,
          orderBy: { recordedAt: 'desc' },
        },
      },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: `No device found with ID: ${id}`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: device,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/devices/:id
 * Updates device metadata, status, or patient association
 */
export async function updateDevice(req, res, next) {
  try {
    const { id } = req.params;

    const parseResult = updateDeviceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid device update data',
          details: parseResult.error.errors,
        },
      });
    }

    const existing = await prisma.device.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: `No device found with ID: ${id}`,
        },
      });
    }

    // Verify patient if updating patientId
    const updateData = { ...parseResult.data };
    if (updateData.patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: updateData.patientId },
      });
      if (!patient) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PATIENT_NOT_FOUND',
            message: `Patient with ID "${updateData.patientId}" does not exist.`,
          },
        });
      }
    }

    const updated = await prisma.device.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            patientCode: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Device updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/devices/:id/heartbeat
 * Updates device heartbeat timestamp and battery telemetry
 */
export async function recordHeartbeat(req, res, next) {
  try {
    const { id } = req.params;

    const parseResult = heartbeatSchema.safeParse(req.body);
    const { batteryLevel, status } = parseResult.success ? parseResult.data : {};

    const updated = await prisma.device.update({
      where: { id },
      data: {
        lastHeartbeat: new Date(),
        status: status || 'ONLINE',
        ...(batteryLevel !== undefined && { batteryLevel }),
      },
    });

    emitDeviceStatus(updated.id, updated.patientId, {
      id: updated.id,
      deviceCode: updated.deviceCode,
      status: updated.status,
      batteryLevel: updated.batteryLevel,
      lastHeartbeat: updated.lastHeartbeat,
    });

    res.status(200).json({
      success: true,
      message: 'Heartbeat recorded.',
      data: {
        id: updated.id,
        deviceCode: updated.deviceCode,
        status: updated.status,
        lastHeartbeat: updated.lastHeartbeat,
        batteryLevel: updated.batteryLevel,
      },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: `No device found with ID: ${req.params.id}`,
        },
      });
    }
    next(error);
  }
}

/**
 * DELETE /api/devices/:id
 * Deletes device registration
 */
export async function deleteDevice(req, res, next) {
  try {
    const { id } = req.params;

    await prisma.device.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Device deleted successfully.',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: `No device found with ID: ${req.params.id}`,
        },
      });
    }
    next(error);
  }
}
