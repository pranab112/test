import { api } from '../services/api';
import type { User, Friend } from '../types';

export interface OnlineStatus {
  user_id: number;
  username: string;
  is_online: boolean;
  last_seen?: string;
}

const USER_ENDPOINTS = {
  SEARCH: '/users/search',
  ALL: '/users/all',
  PROFILE: (id: number) => `/users/${id}`,
  ONLINE_STATUS: '/users/online-status',
};

export const usersApi = {
  // Search users
  searchUsers: async (query: string): Promise<Friend[]> => {
    try {
      const response = await api.get(USER_ENDPOINTS.SEARCH, {
        params: { query },
      });
      return response as unknown as Friend[];
    } catch (error) {
      throw error;
    }
  },

  // Get all users (for clients)
  getAllUsers: async (skip = 0, limit = 50, userType?: string): Promise<User[]> => {
    try {
      const params: Record<string, unknown> = { skip, limit };
      if (userType) params.user_type = userType;
      const response = await api.get(USER_ENDPOINTS.ALL, { params });
      return response as unknown as User[];
    } catch (error) {
      throw error;
    }
  },

  // Get user profile
  getUserProfile: async (userId: number): Promise<User> => {
    try {
      const response = await api.get(USER_ENDPOINTS.PROFILE(userId));
      return response as unknown as User;
    } catch (error) {
      throw error;
    }
  },

  // Get online status for multiple users
  getOnlineStatus: async (userIds: number[]): Promise<OnlineStatus[]> => {
    try {
      const response = await api.get(USER_ENDPOINTS.ONLINE_STATUS, {
        params: { user_ids: userIds.join(',') },
      });
      return response as unknown as OnlineStatus[];
    } catch (error) {
      throw error;
    }
  },
};
