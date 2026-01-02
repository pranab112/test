export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws',
  // Base URL for file uploads (without /api/v1)
  FILE_BASE_URL: import.meta.env.VITE_FILE_URL || 'http://localhost:8000',
  TIMEOUT: 30000,
} as const;

// Helper to resolve file URLs (images, audio, etc.)
export const getFileUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  // If it's already an absolute URL (S3, etc.), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If it's a relative URL, prepend the file base URL
  return `${API_CONFIG.FILE_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  USERS: {
    BASE: '/users',
    SEARCH: '/users/search',
  },
  FRIENDS: {
    BASE: '/friends',
    REQUESTS: '/friends/requests',
  },
  MESSAGES: {
    BASE: '/messages',
  },
  PROMOTIONS: {
    BASE: '/promotions',
  },
  GAMES: {
    BASE: '/games',
  },
} as const;
