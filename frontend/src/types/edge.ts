export interface ComparativeModelInfo {
  name: string;
  description: string;
  transmittedReadings: number;
  bandwidthUsagePct: number;
  bandwidthSavingsPct?: number;
  averageDetectionLatencyMs: number;
  offlineResilience: string;
  cloudComputeBurden: string;
}

export interface MetricSnapshot {
  timestamp: string;
  generated: number;
  transmitted: number;
  summarized: number;
  reductionPct: number;
  edgeLatencyMs: number;
  cloudLatencyMs: number;
}

export interface EdgeMetricsData {
  totalReadingsGenerated: number;
  readingsProcessedLocally: number;
  readingsTransmitted: number;
  readingsSummarized: number;
  alertsGeneratedLocally: number;
  offlineBufferedReadings: number;
  transmissionReductionPercent: number;
  averageEdgeProcessingLatencyMs: number;
  averageBackendTransmissionLatencyMs: number;
  simulatedCentralizedDetectionLatencyMs: number;
  detectionSpeedupFactor: number;
  comparativeModels: {
    centralized: ComparativeModelInfo;
    edge: ComparativeModelInfo;
  };
  historySnapshots: MetricSnapshot[];
}

export interface EdgeMetricsResponse {
  success: boolean;
  data: EdgeMetricsData;
  disclaimer: string;
}

export interface ThresholdBounds {
  normalMin?: number;
  normalMax?: number;
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
}

export interface ThresholdProfile {
  name: string;
  description: string;
  heartRate: ThresholdBounds;
  spo2: ThresholdBounds;
  bloodPressureSys: ThresholdBounds;
  bloodPressureDia: ThresholdBounds;
  temperature: ThresholdBounds;
  persistenceSamples?: number;
  hysteresisBand?: Record<string, number>;
}

export interface BackendAlert {
  id: string;
  patientId: string;
  deviceId?: string | null;
  vitalType: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  currentValue?: string | null;
  thresholdValue?: string | null;
  isAcknowledged: boolean;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  isResolved: boolean;
  resolvedAt?: string | null;
  createdAt: string;
  patient?: {
    id: string;
    name: string;
    patientCode: string;
    riskLevel?: string;
    roomOrLocation?: string | null;
  };
  device?: {
    id: string;
    deviceCode: string;
    name: string;
  } | null;
}
