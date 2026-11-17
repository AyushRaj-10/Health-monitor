import { prisma } from '../config/prisma.js';
import { createPatientSchema, updatePatientSchema } from '../validations/patient.validation.js';
import { recordAuditLog } from '../services/audit.service.js';
import { encryptDataAtRest, maskPatientSensitiveFields } from '../utils/crypto.util.js';

/**
 * POST /api/patients
 * Creates a new patient record
 * Allowed roles: ADMIN, DOCTOR, NURSE
 */
export async function createPatient(req, res, next) {
  try {
    const parseResult = createPatientSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid patient input data',
          details: parseResult.error.errors,
        },
      });
    }

    const {
      patientCode,
      name,
      dateOfBirth,
      gender,
      contactInformation,
      assignedDoctorId,
      medicalHistory,
      condition,
      riskLevel,
      roomOrLocation,
      status,
    } = parseResult.data;

    // Check if patientCode already exists
    const existing = await prisma.patient.findUnique({
      where: { patientCode: patientCode.trim() },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'PATIENT_CODE_EXISTS',
          message: `A patient with code "${patientCode}" already exists in the system.`,
        },
      });
    }

    // Verify assigned doctor if provided
    let doctorIdToAssign = assignedDoctorId;
    if (assignedDoctorId) {
      const doctor = await prisma.user.findUnique({
        where: { id: assignedDoctorId },
      });
      if (!doctor || (doctor.role !== 'DOCTOR' && doctor.role !== 'ADMIN')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ASSIGNED_DOCTOR',
            message: 'The assignedDoctorId must reference an active Doctor or Administrator.',
          },
        });
      }
    } else if (req.user.role === 'DOCTOR') {
      // Default to the creating doctor if they are a DOCTOR
      doctorIdToAssign = req.user.id;
    }

    const newPatient = await prisma.patient.create({
      data: {
        patientCode: patientCode.trim(),
        name: name.trim(),
        dateOfBirth: new Date(dateOfBirth),
        gender,
        contactInformation: contactInformation ? encryptDataAtRest(contactInformation) : null,
        assignedDoctorId: doctorIdToAssign || null,
        medicalHistory: medicalHistory || null,
        condition: condition || 'Routine Telemetry Monitoring',
        riskLevel: riskLevel || 'LOW',
        roomOrLocation: roomOrLocation || 'Outpatient Tele-Rehab',
        status: status || 'ACTIVE',
      },
      include: {
        assignedDoctor: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    // Record Immutable Audit Log
    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'PATIENT_CREATE',
      resourceType: 'Patient',
      resourceId: newPatient.id,
      metadata: { patientCode: newPatient.patientCode, name: newPatient.name },
      ipAddress: req.ip,
      status: 'SUCCESS',
    });

    res.status(201).json({
      success: true,
      message: 'Patient record created successfully.',
      data: newPatient,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/patients
 * Retrieves paginated, searchable, and filtered patient records
 */
export async function getPatients(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const {
      search,
      q,
      gender,
      riskLevel,
      status,
      assignedDoctorId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const searchTerm = (search || q || '').trim();

    // Construct Prisma where query
    const where = {};

    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { patientCode: { contains: searchTerm, mode: 'insensitive' } },
        { condition: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (gender && ['Male', 'Female', 'Other'].includes(gender)) {
      where.gender = gender;
    }

    if (riskLevel && ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(riskLevel)) {
      where.riskLevel = riskLevel;
    }

    if (status && ['ACTIVE', 'DISCHARGED', 'OBSERVATION'].includes(status)) {
      where.status = status;
    }

    if (assignedDoctorId) {
      where.assignedDoctorId = assignedDoctorId;
    }

    // Determine sort field safely
    const allowedSortFields = ['createdAt', 'name', 'patientCode', 'dateOfBirth', 'riskLevel', 'status'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [validSortBy]: validSortOrder },
        include: {
          assignedDoctor: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: patients,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/patients/:id
 * Fetches a single patient record by ID
 */
export async function getPatientById(req, res, next) {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        assignedDoctor: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        devices: {
          select: {
            id: true,
            name: true,
            deviceCode: true,
            deviceType: true,
            status: true,
            batteryLevel: true,
            edgeNodeId: true,
            lastHeartbeat: true,
          },
        },
      },
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

    // Record Immutable Audit Log for Clinical Record Access
    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'PATIENT_RECORD_VIEW',
      resourceType: 'Patient',
      resourceId: patient.id,
      metadata: { patientCode: patient.patientCode, accessType: req.isAssignedDoctor ? 'PRIMARY_CARE' : 'WARD_OVERSIGHT' },
      ipAddress: req.ip,
      status: 'SUCCESS',
    });

    // Apply sensitive field masking based on role authorization
    const sanitizedPatient = maskPatientSensitiveFields(patient, req.user, req.isAssignedDoctor);

    res.status(200).json({
      success: true,
      data: sanitizedPatient,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/patients/:id
 * Updates an existing patient record
 */
export async function updatePatient(req, res, next) {
  try {
    const { id } = req.params;

    const parseResult = updatePatientSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid update data',
          details: parseResult.error.errors,
        },
      });
    }

    // Check if patient exists
    const existing = await prisma.patient.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: `No patient found with ID: ${id}`,
        },
      });
    }

    // Role check: Nurses can update status/vitals, Doctors can update clinical info, Admins can update all
    const updateData = { ...parseResult.data };
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }
    if (updateData.contactInformation) {
      updateData.contactInformation = encryptDataAtRest(updateData.contactInformation);
    }

    // Verify assigned doctor if updating
    if (updateData.assignedDoctorId) {
      const doctor = await prisma.user.findUnique({
        where: { id: updateData.assignedDoctorId },
      });
      if (!doctor || (doctor.role !== 'DOCTOR' && doctor.role !== 'ADMIN')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ASSIGNED_DOCTOR',
            message: 'Assigned doctor must be an active Doctor or Administrator.',
          },
        });
      }
    }

    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: updateData,
      include: {
        assignedDoctor: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    // Record Immutable Audit Log
    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'PATIENT_UPDATE',
      resourceType: 'Patient',
      resourceId: updatedPatient.id,
      metadata: { patientCode: updatedPatient.patientCode, changedFields: Object.keys(updateData) },
      ipAddress: req.ip,
      status: 'SUCCESS',
    });

    res.status(200).json({
      success: true,
      message: 'Patient record updated successfully.',
      data: updatedPatient,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/patients/:id
 * Removes a patient record
 * Allowed roles: ADMIN or Assigned DOCTOR
 */
export async function deletePatient(req, res, next) {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id },
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

    // Only ADMIN or the assigned DOCTOR can delete the patient record
    if (req.user.role !== 'ADMIN' && patient.assignedDoctorId !== req.user.id) {
      recordAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        resourceType: 'Patient',
        resourceId: patient.id,
        metadata: { reason: 'UNAUTHORIZED_PATIENT_DELETE_ATTEMPT' },
        ipAddress: req.ip,
        status: 'DENIED',
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only an Administrator or the patient’s assigned Attending Doctor can remove this medical record.',
        },
      });
    }

    await prisma.patient.delete({
      where: { id },
    });

    // Record Immutable Audit Log
    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'PATIENT_DELETE',
      resourceType: 'Patient',
      resourceId: patient.id,
      metadata: { patientCode: patient.patientCode, name: patient.name },
      ipAddress: req.ip,
      status: 'SUCCESS',
    });

    res.status(200).json({
      success: true,
      message: `Patient ${patient.name} (${patient.patientCode}) removed successfully.`,
    });
  } catch (error) {
    next(error);
  }
}
