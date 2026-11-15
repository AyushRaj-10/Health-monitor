export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED';

export type DeviceType =
  | 'ECG_PATCH'
  | 'PULSE_OXIMETER'
  | 'HOLTER_MONITOR'
  | 'SMARTWATCH'
  | 'BP_CUFF'
  | 'TEMP_SENSOR'
  | 'MULTI_PARAM';

export interface DevicePatientSummary {
  id: string;
  name: string;
  patientCode: string;
  riskLevel?: string;
}

export interface IoMTDevice {
  id: string;
  deviceCode: string;
  name: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  batteryLevel: number;
  firmwareVersion: string;
  edgeNodeId: string;
  apiKey: string;
  isSimulated: boolean;
  lastHeartbeat?: string | null;
  patientId?: string | null;
  patient?: DevicePatientSummary | null;
  _count?: {
    readings: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceInput {
  deviceCode: string;
  name: string;
  deviceType: DeviceType;
  patientId?: string | null;
  batteryLevel?: number;
  firmwareVersion?: string;
  edgeNodeId?: string;
  apiKey?: string;
  isSimulated?: boolean;
}

export interface UpdateDeviceInput {
  name?: string;
  deviceType?: DeviceType;
  patientId?: string | null;
  status?: DeviceStatus;
  batteryLevel?: number;
  firmwareVersion?: string;
  edgeNodeId?: string;
}

export interface SimulatedDeviceAgentStatus {
  id: string;
  deviceCode: string;
  name: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  intervalMs: number;
  scenario: string;
  isRunning: boolean;
  batteryLevel: number;
  lastStatus: string;
  lastError: string | null;
  lastSentAt: string | null;
  readingsCount: number;
  lastReading: {
    heartRate: number;
    spo2: number;
    bloodPressureSys: number;
    bloodPressureDia: number;
    temperature: number;
    respiratoryRate?: number;
    scenario: string;
    isSimulated: boolean;
    recordedAt: string;
  } | null;
}

export interface SimulatorStatusResponse {
  online: boolean;
  uptimeSeconds?: number;
  backendUrl?: string;
  port?: number;
  totalDevices: number;
  activeStreamingDevices: number;
  message?: string;
  devices: SimulatedDeviceAgentStatus[];
  scenarios: Array<{
    id: string;
    name: string;
    description: string;
    target: {
      heartRate: number;
      spo2: number;
      bloodPressureSys: number;
      bloodPressureDia: number;
      temperature: number;
      respiratoryRate: number;
    };
  }>;
}
