import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';
import type { Friend, FriendRequest } from '../types';

export const friendsApi = {
  // Get all friends
  getFriends: async (): Promise<Friend[]> => {
    const response = await api.get(API_ENDPOINTS.FRIENDS.BASE + '/');
    return (response as any).friends || [];
  },

  // Send friend request
  sendFriendRequest: async (userId: number): Promise<{ message: string }> => {
    const response = await api.post(`${API_ENDPOINTS.FRIENDS.SEND}/${userId}`);
    return response as any;
  },

  // Get pending friend requests
  getPendingRequests: async (): Promise<FriendRequest[]> => {
    const response = await api.get(API_ENDPOINTS.FRIENDS.REQUESTS);
    return response as unknown as FriendRequest[];
  },

  // Accept friend request
  acceptRequest: async (requestId: number): Promise<{ message: string }> => {
    const response = await api.post(`${API_ENDPOINTS.FRIENDS.ACCEPT}/${requestId}`);
    return response as any;
  },

  // Reject friend request
  rejectRequest: async (requestId: number): Promise<{ message: string }> => {
    const response = await api.post(`${API_ENDPOINTS.FRIENDS.REJECT}/${requestId}`);
    return response as any;
  },

  // Remove friend
  removeFriend: async (friendId: number): Promise<{ message: string }> => {
    const response = await api.delete(`${API_ENDPOINTS.FRIENDS.REMOVE}/${friendId}`);
    return response as any;
  },

  // Search users for friend requests
  searchUsers: async (query: string): Promise<Friend[]> => {
    const response = await api.get(API_ENDPOINTS.FRIENDS.SEARCH, {
      params: { q: query },
    });
    return response as unknown as Friend[];
  },
};
