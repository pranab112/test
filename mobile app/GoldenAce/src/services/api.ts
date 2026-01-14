import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../config/api.config';
import { tokenStorage, clearAllStorage } from './storage';
import { router } from 'expo-router';

// Create axios instance
export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Debug logging in development
    if (__DEV__) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
      });
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
  async (error: AxiosError) => {
    const requestUrl = error.config?.url || '';

    // Debug logging in development
    if (__DEV__) {
      console.log(`[API ERROR] ${error.config?.method?.toUpperCase()} ${requestUrl}`, {
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    // Handle 401 Unauthorized - but NOT for login endpoints
    const isLoginEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/token');

    if (error.response?.status === 401 && !isLoginEndpoint) {
      await clearAllStorage();
      router.replace('/login');
    }

    // Handle other errors
    const errorMessage = error.response?.data || {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    };

    return Promise.reject(errorMessage);
  }
);

export const apiClient = api;
