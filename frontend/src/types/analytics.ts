export interface PopulationStats {
  avgHeartRate: number;
  minHeartRate: number;
  maxHeartRate: number;
  avgSpo2: number;
  minSpo2: number;
  maxSpo2: number;
  avgSystolic: number;
  minSystolic: number;
  maxSystolic: number;
  avgDiastolic: number;
  minDiastolic: number;
  maxDiastolic: number;
  avgTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  sampleCount: number;
}

export interface AlertTrendPoint {
  date: string;
  totalAlerts: number;
  critical: number;
  warning: number;
  info: number;
  resolved: number;
}

export interface VitalsTrendPoint {
  bucketTime: string;
  avgHeartRate: number;
  avgSpo2: number;
  avgSystolic: number;
  avgDiastolic: number;
  avgTemperature: number;
  readingCount: number;
}

export interface PatientMonitoringSummary {
  id: string;
  patientCode: string;
  name: string;
  riskLevel: string;
  room: string | null;
  assignedDoctor: string;
  totalReadings: number;
  activeAlerts: number;
}

export interface AnalyticsOverviewData {
  period: {
    timeRange: string;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalReadings: number;
    totalAlerts: number;
    totalPatients: number;
    openAlerts: number;
    criticalAlerts: number;
  };
  populationStats: PopulationStats;
  alertsBySeverity: {
    CRITICAL: number;
    WARNING: number;
    INFO: number;
  };
  alertsByStatus: {
    OPEN: number;
    ACKNOWLEDGED: number;
    RESOLVED: number;
  };
  alertTrends: AlertTrendPoint[];
  vitalsTrends: VitalsTrendPoint[];
  topAlertTypes: Array<{ vitalType: string; count: number }>;
  patientSummaries: PatientMonitoringSummary[];
}

export interface AggregatedVitalBucket {
  bucketTime: string;
  avgHeartRate: number;
  minHeartRate: number;
  maxHeartRate: number;
  avgSpo2: number;
  minSpo2: number;
  maxSpo2: number;
  avgSystolic: number;
  minSystolic?: number;
  maxSystolic?: number;
  avgDiastolic: number;
  minDiastolic?: number;
  maxDiastolic?: number;
  avgTemperature: number;
  minTemperature?: number;
  maxTemperature?: number;
  sampleCount: number;
}

export interface PatientVitalsAnalyticsResponse {
  patient: {
    id: string;
    patientCode: string;
    name: string;
  };
  bucket: string;
  period: {
    startDate: string;
    endDate: string;
  };
  pointsCount: number;
  points: AggregatedVitalBucket[];
}

export interface PatientAnalyticsResponse {
  patient: {
    id: string;
    patientCode: string;
    name: string;
    dateOfBirth: string;
    gender: string;
    riskLevel: string;
    condition: string;
    roomOrLocation: string;
    assignedDoctor: string;
    devices: any[];
  };
  period: {
    timeRange: string;
    startDate: string;
    endDate: string;
  };
  vitalsSummary: PopulationStats;
  alertsSummary: {
    total: number;
    open: number;
    acknowledged: number;
    resolved: number;
    critical: number;
  };
  recentAlerts: any[];
}
