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
};
