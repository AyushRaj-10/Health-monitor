export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Alert {
  id: string;
  patientId: string;
  deviceId?: string | null;
  alertType: string;
  vitalType?: string;
  severity: AlertSeverity;
  message: string;
  source: string;
  status: AlertStatus;
  triggeredAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  acknowledgedBy?: string | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
  currentValue?: string | null;
  thresholdValue?: string | null;
  isAcknowledged: boolean;
  isResolved: boolean;
  createdAt: string;
  updatedAt?: string;
  patient?: {
    id: string;
    name: string;
    patientCode: string;
    gender?: string;
    dateOfBirth?: string;
    riskLevel?: string;
    roomOrLocation?: string | null;
    assignedDoctor?: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
  device?: {
    id: string;
    deviceCode: string;
    name: string;
    deviceType?: string;
    batteryLevel?: number;
    status?: string;
  } | null;
}

export interface GetAlertsParams {
  severity?: string;
  status?: string;
  isResolved?: boolean;
  patientId?: string;
  deviceId?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
}

export interface GetAlertsResponse {
  success: boolean;
  data: Alert[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    openCount: number;
    acknowledgedCount: number;
    resolvedCount: number;
    criticalCount: number;
  };
}
