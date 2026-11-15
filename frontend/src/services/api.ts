import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

// Centralized Axios instance configured for future backend integration
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Centralized TanStack Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

/**
 * Checks backend health endpoint
 */
export async function fetchBackendHealth() {
  const response = await apiClient.get('/health');
  return response.data;
}
