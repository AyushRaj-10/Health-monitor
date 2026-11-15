import { z } from 'zod';

export const ingestReadingItemSchema = z.object({
  heartRate: z
    .number()
    .min(20, 'Heart rate must be at least 20 bpm')
    .max(260, 'Heart rate must not exceed 260 bpm'),
  spo2: z
    .number()
    .min(50, 'SpO2 must be at least 50%')
    .max(100, 'SpO2 cannot exceed 100%'),
  bloodPressureSys: z
    .number()
    .min(40, 'Systolic BP must be at least 40 mmHg')
    .max(280, 'Systolic BP must not exceed 280 mmHg'),
  bloodPressureDia: z
    .number()
    .min(30, 'Diastolic BP must be at least 30 mmHg')
    .max(200, 'Diastolic BP must not exceed 200 mmHg'),
  temperature: z
    .number()
    .min(30.0, 'Body temperature must be at least 30.0°C')
    .max(45.0, 'Body temperature must not exceed 45.0°C'),
  respiratoryRate: z.number().min(4).max(60).optional(),
  isSimulated: z.boolean().optional().default(true),
  scenario: z.string().optional().default('NORMAL'),
  recordedAt: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid recordedAt timestamp format',
    }),
});

export const ingestVitalsSchema = z.object({
  deviceId: z.string().min(1, 'Device identifier is required'),
  apiKey: z.string().min(1, 'Device API key is required'),
  patientId: z.string().min(1, 'Patient identifier is required'),
  // Can be a single reading fields embedded, or a batch array
  heartRate: z.number().min(20).max(260).optional(),
  spo2: z.number().min(50).max(100).optional(),
  bloodPressureSys: z.number().min(40).max(280).optional(),
  bloodPressureDia: z.number().min(30).max(200).optional(),
  temperature: z.number().min(30.0).max(45.0).optional(),
  respiratoryRate: z.number().min(4).max(60).optional(),
  isSimulated: z.boolean().optional().default(true),
  scenario: z.string().optional().default('NORMAL'),
  recordedAt: z.string().optional(),
  readings: z.array(ingestReadingItemSchema).optional(),
}).refine(
  (data) => (data.heartRate !== undefined && data.spo2 !== undefined) || (data.readings && data.readings.length > 0),
  {
    message: 'Either individual vital metrics (heartRate, spo2, etc.) or a readings array must be provided.',
  }
);
