export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  ADMIN: {
    DASHBOARD: '/admin',
    USERS: '/admin/users',
    APPROVALS: '/admin/approvals',
    REPORTS: '/admin/reports',
    OFFERS: '/admin/offers',
  },

  CLIENT: {
    DASHBOARD: '/client',
    PLAYERS: '/client/players',
    PROMOTIONS: '/client/promotions',
    GAMES: '/client/games',
    ANALYTICS: '/client/analytics',
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
