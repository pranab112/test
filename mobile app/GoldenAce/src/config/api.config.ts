// API Configuration for GoldenAce Mobile App
// Update BASE_URL to your production server URL when deploying

export const API_CONFIG = {
  // For development, use your local machine's IP address
  // For Android emulator, use 10.0.2.2 instead of localhost
  // For iOS simulator, localhost works fine
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api/v1',
  WS_URL: process.env.EXPO_PUBLIC_WS_URL || 'ws://10.0.2.2:8000/ws',
  FILE_BASE_URL: process.env.EXPO_PUBLIC_FILE_URL || 'http://10.0.2.2:8000',
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
    CHANGE_PASSWORD: '/auth/change-password',
  },
  USERS: {
    BASE: '/users',
    SEARCH: '/users/search',
  },
  FRIENDS: {
    BASE: '/friends',
    REQUESTS: '/friends/requests/pending',
    SEND: '/friends/send',
    ACCEPT: '/friends/accept',
    REJECT: '/friends/reject',
    REMOVE: '/friends/remove',
    SEARCH: '/friends/search',
  },
  CHAT: {
    CONVERSATIONS: '/chat/conversations',
    MESSAGES: '/chat/messages',
    SEND_TEXT: '/chat/send/text',
    SEND_IMAGE: '/chat/send/image',
    SEND_VOICE: '/chat/send/voice',
    STATS: '/chat/stats',
  },
  GAMES: {
    BASE: '/games',
    ADMIN: '/admin/games',
    MY_GAMES: '/games/my-games-details',
    UPDATE_GAMES: '/games/update-games',
    CLIENT_GAMES: '/games/client',
  },
  OFFERS: {
    AVAILABLE: '/offers/available',
    MY_CLAIMS: '/offers/my-claims',
    CLAIM: '/offers/claim',
    CLIENT_PENDING: '/offers/client/pending-claims',
    CLIENT_ALL: '/offers/client/all-claims',
    PROCESS_CLAIM: '/offers/client/process-claim',
  },
  PROMOTIONS: {
    BASE: '/promotions',
  },
  CLIENT: {
    DASHBOARD: '/client/dashboard',
    PLAYERS: '/client/players',
    ANALYTICS: '/client/analytics',
  },
} as const;
