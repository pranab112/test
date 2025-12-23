export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws',
  TIMEOUT: 30000,
} as const;

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
