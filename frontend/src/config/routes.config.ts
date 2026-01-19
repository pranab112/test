// Secure tokens for admin and client routes from environment variables
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_ROUTE_TOKEN || 'admin-secure-2024';
const CLIENT_TOKEN = import.meta.env.VITE_CLIENT_ROUTE_TOKEN || 'client-secure-2024';

export const ROUTES = {
  HOME: '/',
  LANDING: '/welcome',
  CONTACT: '/contact',
  LOGIN: '/login',
  ADMIN_LOGIN: `/${ADMIN_TOKEN}/login`,
  CLIENT_LOGIN: `/${CLIENT_TOKEN}/login`,

  ADMIN: {
    DASHBOARD: `/${ADMIN_TOKEN}`,
    USERS: `/${ADMIN_TOKEN}/users`,
    APPROVALS: `/${ADMIN_TOKEN}/approvals`,
    REPORTS: `/${ADMIN_TOKEN}/reports`,
    OFFERS: `/${ADMIN_TOKEN}/offers`,
  },

  CLIENT: {
    DASHBOARD: `/${CLIENT_TOKEN}`,
    PLAYERS: `/${CLIENT_TOKEN}/players`,
    PROMOTIONS: `/${CLIENT_TOKEN}/promotions`,
    GAMES: `/${CLIENT_TOKEN}/games`,
    ANALYTICS: `/${CLIENT_TOKEN}/analytics`,
  },

  PLAYER: {
    DASHBOARD: '/player',
    PROMOTIONS: '/player/promotions',
    WALLET: '/player/wallet',
    GAMES: '/player/games',
  },

  SHARED: {
    CHAT: '/chat',
    FRIENDS: '/friends',
    PROFILE: '/profile',
    SETTINGS: '/settings',
  },
} as const;

export { ADMIN_TOKEN, CLIENT_TOKEN };
