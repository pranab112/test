import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';
import type { Friend, FriendRequest } from '../types';

interface FriendsResponse {
  friends: Friend[];
}

export const friendsApi = {
  // Get all friends
  getFriends: async (): Promise<Friend[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.FRIENDS.LIST);
      const data = response as unknown as FriendsResponse;
      return data.friends || [];
    } catch (error) {
      throw error;
    }
  },

  // Send friend request
  sendFriendRequest: async (userId: number): Promise<{ message: string }> => {
    try {
      const response = await api.post(`${API_ENDPOINTS.FRIENDS.SEND}/${userId}`);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Get pending friend requests
  getPendingRequests: async (): Promise<FriendRequest[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.FRIENDS.REQUESTS);
      return response as unknown as FriendRequest[];
    } catch (error) {
      throw error;
    }
  },

  // Accept friend request
  acceptRequest: async (requestId: number): Promise<{ message: string }> => {
    try {
      const response = await api.post(`${API_ENDPOINTS.FRIENDS.ACCEPT}/${requestId}`);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Reject friend request
  rejectRequest: async (requestId: number): Promise<{ message: string }> => {
    try {
      const response = await api.post(`${API_ENDPOINTS.FRIENDS.REJECT}/${requestId}`);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Remove friend
  removeFriend: async (friendId: number): Promise<{ message: string }> => {
    try {
      const response = await api.delete(`${API_ENDPOINTS.FRIENDS.REMOVE}/${friendId}`);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Search users for friend requests
  searchUsers: async (query: string): Promise<Friend[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.FRIENDS.SEARCH, {
        params: { q: query },
      });
      return response as unknown as Friend[];
    } catch (error) {
      throw error;
    }
  },

  // Search user by unique ID
  searchByUniqueId: async (uniqueId: string): Promise<Friend | null> => {
    try {
      const response = await api.get(`${API_ENDPOINTS.FRIENDS.SEARCH}/unique`, {
        params: { user_id: uniqueId },
      });
      return response as unknown as Friend;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};
