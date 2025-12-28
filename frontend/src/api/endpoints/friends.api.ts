import { apiClient } from '../client';

export interface Friend {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  user_type: string;
  profile_picture?: string;
  is_online: boolean;
  player_level?: number;
  credits?: number;
  created_at: string;
}

export interface FriendRequest {
  id: number;
  requester_id: number;
  receiver_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  requester?: {
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
  receiver?: {
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
}

export const friendsApi = {
  // Get all friends
  getFriends: async (): Promise<Friend[]> => {
    const response = await apiClient.get('/friends/');
    return response as any;
  },

  // Send friend request
  sendFriendRequest: async (userId: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/friends/send/${userId}`);
    return response as any;
  },

  // Get pending friend requests
  getPendingRequests: async (): Promise<FriendRequest[]> => {
    const response = await apiClient.get('/friends/requests/pending');
    return response as any;
  },

  // Accept friend request
  acceptRequest: async (requestId: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/friends/accept/${requestId}`);
    return response as any;
  },

  // Reject friend request
  rejectRequest: async (requestId: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/friends/reject/${requestId}`);
    return response as any;
  },

  // Remove friend
  removeFriend: async (friendId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/friends/remove/${friendId}`);
    return response as any;
  },

  // Search users for friend requests
  searchUsers: async (query: string): Promise<Friend[]> => {
    const response = await apiClient.get('/friends/search', {
      params: { q: query },
    });
    return response as any;
  },
};