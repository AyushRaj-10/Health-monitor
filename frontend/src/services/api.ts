import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { LoginResponseData, DoctorOption } from '../types/auth';
import {
  BackendPatient,
  PatientListResponse,
  CreatePatientInput,
  UpdatePatientInput,
} from '../types/patient';
import {
  IoMTDevice,
  CreateDeviceInput,
  UpdateDeviceInput,
  SimulatorStatusResponse,
  SimulatedDeviceAgentStatus,
} from '../types/device';
import {
  PatientVitalsResponse,
  PatientLatestVitalsResponse,
} from '../types/vitals';
import {
  EdgeMetricsResponse,
  BackendAlert,
  ThresholdProfile,
} from '../types/edge';

// Security constraint: Store access token in memory ONLY (never in localStorage)
let inMemoryAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

// Centralized Axios instance with automatic credentials (HttpOnly cookie for refresh token)
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Centralized TanStack Query Client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 15, // 15 seconds
    },
  },
});

// Request Interceptor: Attach in-memory Bearer token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (inMemoryAccessToken && config.headers) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

// Response Interceptor: Handle 401 and perform silent token refresh via HttpOnly cookie
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Ignore refresh loop on auth endpoints
    if (
      !originalRequest ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh-token')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<{
          success: boolean;
          data: { accessToken: string };
        }>('/api/auth/refresh-token', {}, { withCredentials: true });

        const newAccessToken = response.data.data.accessToken;
        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ================= AUTH API METHODS =================

export async function loginApi(email: string, password: string):Promise<LoginResponseData> {
  const response = await apiClient.post<{ success: boolean; data: LoginResponseData }>('/auth/login', {
    email,
    password,
  });
  const data = response.data.data;
  setAccessToken(data.accessToken);
  return data;
}

export async function logoutApi(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

export async function refreshTokenApi(): Promise<LoginResponseData> {
  const response = await apiClient.post<{ success: boolean; data: LoginResponseData }>(
    '/auth/refresh-token'
  );
  const data = response.data.data;
  setAccessToken(data.accessToken);
  return data;
}

export async function getMeApi() {
  const response = await apiClient.get('/auth/me');
  return response.data.data.user;
}

export async function getDoctorsApi(): Promise<DoctorOption[]> {
  const response = await apiClient.get<{ success: boolean; data: DoctorOption[] }>('/auth/doctors');
  return response.data.data;
}

// ================= PATIENT API METHODS =================

export interface GetPatientsParams {
  page?: number;
  limit?: number;
  search?: string;
  gender?: string;
  riskLevel?: string;
  status?: string;
  assignedDoctorId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getPatientsApi(params: GetPatientsParams = {}): Promise<PatientListResponse> {
  const response = await apiClient.get<PatientListResponse>('/patients', { params });
  return response.data;
}

export async function getPatientByIdApi(id: string): Promise<BackendPatient> {
  const response = await apiClient.get<{ success: boolean; data: BackendPatient }>(`/patients/${id}`);
  return response.data.data;
}

export async function createPatientApi(input: CreatePatientInput): Promise<BackendPatient> {
  const response = await apiClient.post<{ success: boolean; data: BackendPatient }>('/patients', input);
  return response.data.data;
}

export async function updatePatientApi(id: string, input: UpdatePatientInput): Promise<BackendPatient> {
  const response = await apiClient.patch<{ success: boolean; data: BackendPatient }>(`/patients/${id}`, input);
  return response.data.data;
}

export async function deletePatientApi(id: string): Promise<void> {
  await apiClient.delete(`/patients/${id}`);
}

export async function fetchBackendHealth() {
  const response = await apiClient.get('/health');
  return response.data;
}

// ================= DEVICE API METHODS =================

export interface GetDevicesParams {
  status?: string;
  deviceType?: string;
  patientId?: string;
  search?: string;
}

export async function getDevicesApi(params: GetDevicesParams = {}): Promise<IoMTDevice[]> {
  const response = await apiClient.get<{ success: boolean; data: IoMTDevice[] }>('/devices', { params });
  return response.data.data;
}

export async function getDeviceByIdApi(id: string): Promise<IoMTDevice> {
  const response = await apiClient.get<{ success: boolean; data: IoMTDevice }>(`/devices/${id}`);
  return response.data.data;
}

export async function createDeviceApi(input: CreateDeviceInput): Promise<IoMTDevice> {
  const response = await apiClient.post<{ success: boolean; data: IoMTDevice }>('/devices', input);
  return response.data.data;
}

export async function updateDeviceApi(id: string, input: UpdateDeviceInput): Promise<IoMTDevice> {
  const response = await apiClient.patch<{ success: boolean; data: IoMTDevice }>(`/devices/${id}`, input);
  return response.data.data;
}

export async function deleteDeviceApi(id: string): Promise<void> {
  await apiClient.delete(`/devices/${id}`);
}

// ================= VITALS API METHODS =================

export interface GetPatientVitalsParams {
  limit?: number;
  startTime?: string;
  endTime?: string;
  scenario?: string;
}

export async function getPatientVitalsApi(
  patientId: string,
  params: GetPatientVitalsParams = {}
): Promise<PatientVitalsResponse> {
  const response = await apiClient.get<PatientVitalsResponse>(
    `/patients/${patientId}/vitals`,
    { params }
  );
  return response.data;
}

export async function getLatestPatientVitalsApi(
  patientId: string
): Promise<PatientLatestVitalsResponse> {
  const response = await apiClient.get<PatientLatestVitalsResponse>(
    `/patients/${patientId}/vitals/latest`
  );
  return response.data;
}

// ================= SIMULATOR CONTROL API METHODS =================

export async function getSimulatorStatusApi(): Promise<SimulatorStatusResponse> {
  const response = await apiClient.get<{ success: boolean; data: SimulatorStatusResponse }>(
    '/simulator/status'
  );
  return response.data.data;
}

export async function startSimulatorAllApi(): Promise<SimulatorStatusResponse> {
  const response = await apiClient.post<{ success: boolean; data: SimulatorStatusResponse }>(
    '/simulator/start-all'
  );
  return response.data.data;
}

export async function stopSimulatorAllApi(): Promise<SimulatorStatusResponse> {
  const response = await apiClient.post<{ success: boolean; data: SimulatorStatusResponse }>(
    '/simulator/stop-all'
  );
  return response.data.data;
}

export async function startSimulatorDeviceApi(deviceCode: string): Promise<SimulatedDeviceAgentStatus> {
  const response = await apiClient.post<{ success: boolean; data: SimulatedDeviceAgentStatus }>(
    `/simulator/device/${deviceCode}/start`
  );
  return response.data.data;
}

export async function stopSimulatorDeviceApi(deviceCode: string): Promise<SimulatedDeviceAgentStatus> {
  const response = await apiClient.post<{ success: boolean; data: SimulatedDeviceAgentStatus }>(
    `/simulator/device/${deviceCode}/stop`
  );
  return response.data.data;
}

export async function setSimulatorScenarioApi(
  deviceCode: string,
  scenario: string,
  autoStart = true
): Promise<SimulatedDeviceAgentStatus> {
  const response = await apiClient.post<{ success: boolean; data: SimulatedDeviceAgentStatus }>(
    `/simulator/device/${deviceCode}/scenario`,
    { scenario, autoStart }
  );
  return response.data.data;
}

export async function setSimulatorIntervalApi(
  deviceCode: string,
  intervalMs: number
): Promise<SimulatedDeviceAgentStatus> {
  const response = await apiClient.post<{ success: boolean; data: SimulatedDeviceAgentStatus }>(
    `/simulator/device/${deviceCode}/interval`,
    { intervalMs }
  );
  return response.data.data;
}

// ================= STAGE 4: EDGE COMPUTING & ANOMALY METRICS API =================

export async function getEdgeMetricsApi(): Promise<EdgeMetricsResponse> {
  const response = await apiClient.get<EdgeMetricsResponse>('/simulator/metrics');
  return response.data;
}

export async function setTransmissionPolicyApi(
  policy: string,
  deviceCode?: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    '/simulator/policy',
    { policy, deviceCode }
  );
  return response.data;
}

export async function toggleNetworkConnectivityApi(
  isOnline?: boolean,
  deviceCode?: string
): Promise<{ success: boolean; message: string; data: any }> {
  const response = await apiClient.post<{ success: boolean; message: string; data: any }>(
    '/simulator/network-toggle',
    { isOnline, deviceCode }
  );
  return response.data;
}

export async function getThresholdProfilesApi(): Promise<{
  profiles: Record<string, ThresholdProfile>;
  disclaimer: string;
}> {
  const response = await apiClient.get<{
    success: boolean;
    data: { profiles: Record<string, ThresholdProfile>; disclaimer: string };
  }>('/simulator/threshold-profiles');
  return response.data.data;
}

export async function updateThresholdsApi(input: {
  deviceCode: string;
  profileName?: string;
  customThresholds?: any;
}): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    '/simulator/thresholds',
    input
  );
  return response.data;
}

export async function syncOfflineBuffersApi(): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    '/simulator/sync-offline',
    {}
  );
  return response.data;
}

// ================= ALERTS API METHODS =================

export interface GetAlertsParams {
  severity?: string;
  isResolved?: boolean;
  patientId?: string;
  limit?: number;
  page?: number;
}

export interface GetAlertsResponse {
  success: boolean;
  data: BackendAlert[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unresolvedCount: number;
    criticalCount: number;
  };
}

export async function getAlertsApi(params: GetAlertsParams = {}): Promise<GetAlertsResponse> {
  const response = await apiClient.get<GetAlertsResponse>('/alerts', { params });
  return response.data;
}

export async function acknowledgeAlertApi(id: string): Promise<BackendAlert> {
  const response = await apiClient.patch<{ success: boolean; data: BackendAlert }>(
    `/alerts/${id}/acknowledge`
  );
  return response.data.data;
}

export async function resolveAlertApi(id: string): Promise<BackendAlert> {
  const response = await apiClient.patch<{ success: boolean; data: BackendAlert }>(
    `/alerts/${id}/resolve`
  );
  return response.data.data;
}

