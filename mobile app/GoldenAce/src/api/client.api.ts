import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';
import type { Friend } from '../types';

export interface ClientDashboardStats {
  total_players: number;
  active_players: number;
  online_players: number;
  total_games: number;
  pending_claims: number;
  total_claims: number;
}

export interface PlayerWithDetails extends Friend {
  is_approved: boolean;
  joined_at: string;
  total_bets?: number;
  total_claims?: number;
}

interface ClientAnalytics {
  daily_active: number[];
  weekly_active: number[];
  monthly_revenue: number[];
}

export interface PlayerCreateRequest {
  username: string;
  full_name: string;
  password?: string;
  referral_code?: string;
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

export interface BulkRegistrationResponse {
  created: PlayerRegistrationResponse[];
  failed: { username: string; reason: string }[];
  total_created: number;
  total_failed: number;
}

export const clientApi = {
  // Get dashboard stats
  getDashboardStats: async (): Promise<ClientDashboardStats> => {
    try {
      const response = await api.get(API_ENDPOINTS.CLIENT.DASHBOARD);
      return response as unknown as ClientDashboardStats;
    } catch (error) {
      throw error;
    }
  },

  // Get all players for this client
  getPlayers: async (
    skip = 0,
    limit = 50,
    search?: string,
    status?: 'all' | 'approved' | 'pending'
  ): Promise<PlayerWithDetails[]> => {
    try {
      const params: Record<string, unknown> = { skip, limit };
      if (search) params.search = search;
      if (status && status !== 'all') params.status = status;

      const response = await api.get(API_ENDPOINTS.CLIENT.PLAYERS, { params });
      return response as unknown as PlayerWithDetails[];
    } catch (error) {
      throw error;
    }
  },

  // Approve a player
  approvePlayer: async (playerId: number): Promise<{ message: string }> => {
    try {
      const response = await api.post(`${API_ENDPOINTS.CLIENT.PLAYERS}/${playerId}/approve`);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Reject a player
  rejectPlayer: async (playerId: number): Promise<{ message: string }> => {
    try {
      const response = await api.post(`${API_ENDPOINTS.CLIENT.PLAYERS}/${playerId}/reject`);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Remove a player
  removePlayer: async (playerId: number): Promise<{ message: string }> => {
    try {
      const response = await api.delete(`${API_ENDPOINTS.CLIENT.PLAYERS}/${playerId}`);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Get analytics
  getAnalytics: async (): Promise<ClientAnalytics> => {
    try {
      const response = await api.get(API_ENDPOINTS.CLIENT.ANALYTICS);
      return response as unknown as ClientAnalytics;
    } catch (error) {
      throw error;
    }
  },

  // Register a new player
  registerPlayer: async (player: PlayerCreateRequest): Promise<PlayerRegistrationResponse> => {
    try {
      const response = await api.post('/client/register-player', player);
      return response as unknown as PlayerRegistrationResponse;
    } catch (error) {
      throw error;
    }
  },

  // Bulk register players
  bulkRegisterPlayers: async (players: PlayerCreateRequest[]): Promise<BulkRegistrationResponse> => {
    try {
      const response = await api.post('/client/bulk-register-players', players);
      return response as unknown as BulkRegistrationResponse;
    } catch (error) {
      throw error;
    }
  },

  // Block/Unblock a player
  togglePlayerBlock: async (playerId: number): Promise<{ message: string; is_active: boolean }> => {
    try {
      const response = await api.patch(`/client/block-player/${playerId}`);
      return response as unknown as { message: string; is_active: boolean };
    } catch (error) {
      throw error;
    }
  },

  // Reset player password
  resetPlayerPassword: async (playerId: number): Promise<{ message: string; temp_password: string }> => {
    try {
      const response = await api.post(`/client/reset-player-password/${playerId}`);
      return response as unknown as { message: string; temp_password: string };
    } catch (error) {
      throw error;
    }
  },

  // Get my players (players created by this client)
  getMyPlayers: async (): Promise<PlayerWithDetails[]> => {
    try {
      const response = await api.get('/client/my-players');
      return response as unknown as PlayerWithDetails[];
    } catch (error) {
      throw error;
    }
  },
};
