import { z } from 'zod';

export const createDeviceSchema = z.object({
  deviceCode: z
    .string()
    .min(3, 'Device code must be at least 3 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Device code must be alphanumeric'),
  name: z.string().min(2, 'Device name must be at least 2 characters'),
  deviceType: z
    .enum(['SMARTWATCH', 'ECG_PATCH', 'PULSE_OXIMETER', 'BP_CUFF', 'EDGE_GATEWAY', 'MULTI_PARAM_MONITOR'])
    .default('SMARTWATCH'),
  patientId: z.string().uuid('Invalid Patient ID').optional().nullable(),
  batteryLevel: z.number().int().min(0).max(100).optional().default(100),
  firmwareVersion: z.string().optional().default('v2.4.1-sim'),
  edgeNodeId: z.string().optional().default('EDGE-GATEWAY-RPI4-01'),
  apiKey: z.string().optional(),
  isSimulated: z.boolean().optional().default(true),
});

export const updateDeviceSchema = z.object({
  name: z.string().min(2).optional(),
  deviceType: z
    .enum(['SMARTWATCH', 'ECG_PATCH', 'PULSE_OXIMETER', 'BP_CUFF', 'EDGE_GATEWAY', 'MULTI_PARAM_MONITOR'])
    .optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'DEGRADED']).optional(),
  batteryLevel: z.number().int().min(0).max(100).optional(),
  patientId: z.string().uuid().optional().nullable(),
  firmwareVersion: z.string().optional(),
  edgeNodeId: z.string().optional(),
  isSimulated: z.boolean().optional(),
});

export const heartbeatSchema = z.object({
  batteryLevel: z.number().int().min(0).max(100).optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'DEGRADED']).optional(),
});
