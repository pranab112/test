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
};
