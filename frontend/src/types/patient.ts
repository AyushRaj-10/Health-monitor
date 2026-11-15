export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type PatientStatus = 'ACTIVE' | 'DISCHARGED' | 'OBSERVATION';

export interface AssignedDoctorSummary {
  id: string;
  name: string;
  email: string;
  department?: string | null;
}

export interface BackendPatient {
  id: string;
  patientCode: string;
  name: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  contactInformation?: string | null;
  assignedDoctorId?: string | null;
  assignedDoctor?: AssignedDoctorSummary | null;
  medicalHistory?: string | null;
  condition?: string | null;
  riskLevel: RiskLevel;
  roomOrLocation?: string | null;
  status: PatientStatus;
  createdAt: string;
  updatedAt: string;
  devices?: Array<{
    id: string;
    deviceName: string;
    deviceType: string;
    status: string;
    batteryLevel: number;
    edgeNodeId: string;
  }>;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PatientListResponse {
  success: boolean;
  data: BackendPatient[];
  pagination: PaginationMeta;
}

export interface CreatePatientInput {
  patientCode: string;
  name: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  contactInformation?: string;
  assignedDoctorId?: string | null;
  medicalHistory?: string;
  condition?: string;
  riskLevel?: RiskLevel;
  roomOrLocation?: string;
  status?: PatientStatus;
}

export interface UpdatePatientInput {
  name?: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  contactInformation?: string;
  assignedDoctorId?: string | null;
  medicalHistory?: string;
  condition?: string;
  riskLevel?: RiskLevel;
  roomOrLocation?: string;
  status?: PatientStatus;
}
