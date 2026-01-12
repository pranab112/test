import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/config/api.config';

// Create axios instance
export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token and handle FormData
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If sending FormData, remove Content-Type header so axios can set it with proper boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response.data, // Return data directly
  (error: AxiosError) => {
    const requestUrl = error.config?.url || '';

    // Handle 401 Unauthorized - but NOT for login endpoints
    // Login failures should show error message, not redirect
    const isLoginEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/token');

    if (error.response?.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');

      // Determine where to redirect based on current path or the API endpoint
      const currentPath = window.location.pathname;
      let redirectPath = '/login';

      if (currentPath.startsWith('/admin') || requestUrl.includes('/admin')) {
        redirectPath = '/admin/login';
      } else if (currentPath.startsWith('/client') || requestUrl.includes('/client')) {
        redirectPath = '/client/login';
      } else if (currentPath.startsWith('/player') || requestUrl.includes('/player')) {
        redirectPath = '/player/login';
      }

      window.location.href = redirectPath;
    }

    // Handle other errors - normalize FastAPI error format
    const responseData = error.response?.data;

    // FastAPI returns errors as { "detail": "message" }
    // Normalize to { message: "...", detail: "..." } for consistency
    let normalizedError;

    if (typeof responseData === 'string') {
      // Error is a plain string
      normalizedError = {
        message: responseData,
        detail: responseData,
        status: error.response?.status,
      };
    } else if (typeof responseData === 'object' && responseData && 'detail' in responseData) {
      const detail = (responseData as any).detail;
      // FastAPI validation error format: { "detail": [{ "loc": [...], "msg": "...", "type": "..." }] }
      if (Array.isArray(detail)) {
        const messages = detail.map((err: any) => {
          const field = err.loc?.slice(1).join('.') || 'field';
          return `${field}: ${err.msg}`;
        }).join(', ');
        normalizedError = {
          message: messages || 'Validation error',
          detail: messages || 'Validation error',
          status: error.response?.status,
        };
      } else {
        // FastAPI format: { "detail": "message" }
        normalizedError = {
          message: detail,
          detail: detail,
          status: error.response?.status,
        };
      }
    } else if (typeof responseData === 'object' && responseData && 'error' in responseData && typeof (responseData as any).error === 'object' && (responseData as any).error && 'message' in (responseData as any).error) {
      // Custom format: { "error": { "message": "..." } }
      normalizedError = {
        message: (responseData as any).error.message,
        detail: (responseData as any).error.message,
        code: (responseData as any).error.code,
        status: error.response?.status,
      };
    } else {
      // Unknown format - use axios error message
      normalizedError = {
        message: error.message || 'An unexpected error occurred',
        detail: error.message || 'An unexpected error occurred',
        status: error.response?.status,
      };
    }

    return Promise.reject(normalizedError);
  }
);

// Export as apiClient for consistency
export const apiClient = api;
