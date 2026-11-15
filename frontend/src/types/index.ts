export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type PatientStatus = 'ACTIVE' | 'DISCHARGED' | 'OBSERVATION';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED';
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface VitalsSummary {
  heartRate: number; // bpm
  spo2: number; // percentage
  bloodPressureSys: number; // mmHg
  bloodPressureDia: number; // mmHg
  temperature: number; // Celsius
  respiratoryRate: number; // breaths/min
  lastUpdated: string;
}

export interface Patient {
  id: string;
  medicalRecordNumber: string;
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  condition: string;
  riskLevel: RiskLevel;
  roomOrLocation: string;
  status: PatientStatus;
  assignedDoctor: string;
  assignedDoctorEmail: string;
  deviceId: string;
  deviceName: string;
  deviceStatus: DeviceStatus;
  deviceBattery: number;
  edgeNodeId: string;
  vitals: VitalsSummary;
  differentialPrivacyBudgetUsed: number; // e.g. 0.04
  noiseAdded: number; // e.g. +0.8
  admissionDate: string;
  notes?: string;
}

export interface VitalTimeSeriesPoint {
  time: string;
  heartRate: number;
  spo2: number;
  bloodPressureSys?: number;
  bloodPressureDia?: number;
  temperature?: number;
  respiratoryRate?: number;
  noiseAdded?: number;
  isAnomaly?: boolean;
}

export interface AlertItem {
  id: string;
  patientId: string;
  patientName: string;
  medicalRecordNumber: string;
  severity: AlertSeverity;
  vitalType: 'Heart Rate' | 'SpO2' | 'Blood Pressure' | 'Respiratory Rate' | 'Edge Gateway' | 'Device Battery';
  message: string;
  currentValue: string;
  thresholdValue: string;
  timestamp: string;
  edgeNodeId: string;
  isAcknowledged: boolean;
  isResolved: boolean;
  acknowledgedBy?: string;
}

export interface EdgeNodeStatus {
  id: string;
  name: string;
  location: string;
  status: 'ONLINE' | 'STANDBY' | 'MAINTENANCE';
  firmware: string;
  activeStreams: number;
  latencyMs: number;
  cpuLoadPercent: number;
  memoryUsagePercent: number;
  bandwidthSavedPercent: number;
  epsilonBudgetTotal: number;
  epsilonBudgetConsumed: number;
  lastSync: string;
}

export interface PrivacyMetricSummary {
  differentialPrivacyEnabled: boolean;
  globalEpsilon: number;
  epsilonConsumedToday: number;
  kAnonymityDegree: number;
  edgeBandwidthSavedPct: number;
  recordsFilteredAtEdge: number;
  encryptedStreamsCount: number;
  encryptionStandard: string;
  lastKeyRotation: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: 'Cardiologist' | 'Staff Nurse' | 'Privacy Officer' | 'Edge System Service' | 'Security Auditor';
  action: string;
  resourceTarget: string;
  edgeNodeId: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FLAGGED' | 'BLOCKED';
  cryptographicSignature: string;
  details: string;
}
