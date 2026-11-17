export type ConsentStatus = 'GRANTED' | 'REVOKED' | 'EXPIRED' | 'PENDING';
export type ConsentPurpose =
  | 'REMOTE_MONITORING'
  | 'EMERGENCY_CARE'
  | 'CLINICAL_RESEARCH'
  | 'TELEMETRY_INGESTION'
  | 'AI_MODEL_TRAINING'
  | 'THIRD_PARTY_AUDIT';

export interface PatientConsent {
  id: string;
  patientId: string;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  grantedBy?: string | null;
  grantedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revocationReason?: string | null;
  authorizedRoles: string[];
  authorizedPurposes: string[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    patientCode: string;
    name: string;
    riskLevel?: string;
  };
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status: 'SUCCESS' | 'DENIED' | 'FAILURE';
  timestamp: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string | null;
  } | null;
}

export interface GetAuditLogsParams {
  action?: string;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetAuditLogsResponse {
  success: boolean;
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unauthorizedAttempts: number;
    totalDenied: number;
  };
}

export interface SecurityOverviewData {
  cryptography: {
    dataAtRestEncryption: string;
    keyDerivation: string;
    fieldMasking: string;
    inTransitEncryption: string;
  };
  permissionsMatrix: Record<string, string[]>;
  metrics: {
    totalAuditEntries: number;
    unauthorizedAttempts: number;
    activeConsents: number;
    revokedConsents: number;
    totalUsers: number;
  };
  differentialPrivacy: {
    status: string;
    epsilonBudget: number;
    delta: number;
    mechanism: string;
    bandwidthSavingsPct: number;
  };
  complianceSafeguards: {
    hipaaSecurityRule: Record<string, string>;
    gdprSafeguards: Record<string, string>;
  };
  recentSecurityEvents: AuditLog[];
}
