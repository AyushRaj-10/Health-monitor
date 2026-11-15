import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { LoginResponseData, DoctorOption } from '../types/auth';
import {
  BackendPatient,
  PatientListResponse,
  CreatePatientInput,
  UpdatePatientInput,
} from '../types/patient';

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
