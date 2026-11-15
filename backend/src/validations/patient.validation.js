import { z } from 'zod';

export const createPatientSchema = z.object({
  patientCode: z.string().min(3, 'Patient code must be at least 3 characters').regex(/^[A-Z0-9_-]+$/i, 'Patient code must be alphanumeric'),
  name: z.string().min(2, 'Patient name must be at least 2 characters'),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date of birth format (must be valid ISO date string)',
  }),
  gender: z.enum(['Male', 'Female', 'Other']),
  contactInformation: z.string().optional().nullable(),
  assignedDoctorId: z.string().uuid('Invalid Doctor ID format').optional().nullable(),
  medicalHistory: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  riskLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional().default('LOW'),
  roomOrLocation: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'DISCHARGED', 'OBSERVATION']).optional().default('ACTIVE'),
});

export const updatePatientSchema = z.object({
  name: z.string().min(2).optional(),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date of birth format',
  }).optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  contactInformation: z.string().optional().nullable(),
  assignedDoctorId: z.string().uuid().optional().nullable(),
  medicalHistory: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  riskLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional(),
  roomOrLocation: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'DISCHARGED', 'OBSERVATION']).optional(),
});
