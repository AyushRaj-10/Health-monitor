export interface VitalReading {
  id: string;
  patientId: string;
  deviceId: string;
  device?: {
    id?: string;
    deviceCode: string;
    name: string;
    deviceType: string;
    status?: string;
    batteryLevel?: number;
    lastHeartbeat?: string;
  };
  heartRate: number;
  spo2: number;
  bloodPressureSys: number;
  bloodPressureDia: number;
  temperature: number;
  respiratoryRate?: number | null;
  isSimulated: boolean;
  scenario: string;
  recordedAt: string;
  createdAt: string;
}

export interface PatientVitalsResponse {
  success: boolean;
  data: VitalReading[];
  count: number;
  total: number;
  patient: {
    id: string;
    name: string;
    patientCode: string;
  };
}

export interface PatientLatestVitalsResponse {
  success: boolean;
  data: VitalReading | null;
  patient: {
    id: string;
    name: string;
    patientCode: string;
  };
}
