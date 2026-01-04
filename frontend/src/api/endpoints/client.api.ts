import { apiClient } from '../client';

// Player Stats
export interface PlayerStats {
  total_players: number;
  active_players: number;
  online_players: number;
  total_credits: number;
  avg_credits: number;
  avg_level: number;
}

// Player Registration
export interface PlayerCreateRequest {
  username: string;
  full_name: string;
  password?: string;
}

export interface PlayerRegistrationResponse {
  id: number;
  username: string;
  full_name: string;
  user_id: string;
  user_type: string;
  is_active: boolean;
  created_at: string;
  player_level: number;
  credits: number;
  temp_password?: string;
}

// Bulk Registration
export interface BulkPlayerCreate {
  username: string;
  full_name: string;
}

export interface BulkRegistrationResponse {
  created_players: PlayerRegistrationResponse[];
  failed: Array<{ username: string; reason: string }>;
  total_created: number;
  total_failed: number;
}

// Player
export interface Player {
  id: number;
  username: string;
  email?: string;
  full_name: string;
  user_id: string;
  user_type: string;
  is_active: boolean;
  is_online: boolean;
  created_at: string;
  player_level: number;
  credits: number;
  profile_picture?: string;
  last_seen?: string;
}

// Recent Activity
export interface ActivityItem {
  id: number;
  type: string;
  player_username: string;
  description: string;
  created_at: string;
}

export interface RecentActivityResponse {
  activities: ActivityItem[];
}

// Game types
export interface Game {
  id: number;
  name: string;
  display_name: string;
  icon_url: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ClientGameWithDetails {
  id: number;
  game_id: number;
  game: Game;
  is_active: boolean;
  game_link: string | null;
  custom_image_url: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ClientGamesWithDetailsResponse {
  games: ClientGameWithDetails[];
}

export interface ClientGameUpdateRequest {
  game_link?: string;
  custom_image_url?: string;
  is_active?: boolean;
}

// Player Payment Preferences (for client view)
export interface PaymentMethodDetail {
  method_id: number;
  method_name: string;
  method_display_name: string;
  account_info?: string;
}

export interface PlayerPaymentPreferencesSummary {
  player_id: number;
  player_username: string;
  receive_methods: PaymentMethodDetail[];
  send_methods: PaymentMethodDetail[];
}

export const clientApi = {
  // Player Registration
  registerPlayer: async (player: PlayerCreateRequest): Promise<PlayerRegistrationResponse> => {
    const response = await apiClient.post('/client/register-player', player);
    return response as any;
  },

  bulkRegisterPlayers: async (players: BulkPlayerCreate[]): Promise<BulkRegistrationResponse> => {
    const response = await apiClient.post('/client/bulk-register-players', { players });
    return response as any;
  },

  // Player Management
  getMyPlayers: async (): Promise<Player[]> => {
    const response = await apiClient.get('/client/my-players');
    return response as any;
  },

  getPlayerStats: async (): Promise<PlayerStats> => {
    const response = await apiClient.get('/client/player-stats');
    return response as any;
  },

  // Recent Activity
  getRecentActivity: async (): Promise<RecentActivityResponse> => {
    const response = await apiClient.get('/client/recent-activity');
    return response as any;
  },

  // Games Management
  getAllGames: async (): Promise<Game[]> => {
    const response = await apiClient.get('/games/');
    return response as any;
  },

  getMyGamesWithDetails: async (): Promise<ClientGamesWithDetailsResponse> => {
    const response = await apiClient.get('/games/my-games-details');
    return response as any;
  },

  updateGameSelection: async (gameIds: number[]): Promise<{ available_games: Game[] }> => {
    const response = await apiClient.post('/games/update-games', { game_ids: gameIds });
    return response as any;
  },

  updateClientGame: async (clientGameId: number, data: ClientGameUpdateRequest): Promise<ClientGameWithDetails> => {
    const response = await apiClient.patch(`/games/my-games/${clientGameId}`, data);
    return response as any;
  },

  // Player Payment Preferences
  getPlayerPaymentPreferences: async (playerId: number): Promise<PlayerPaymentPreferencesSummary> => {
    const response = await apiClient.get(`/payment-methods/player/${playerId}/preferences`);
    return response as any;
  },
};
