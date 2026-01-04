import { apiClient } from '../client';

export interface Friend {
  id: number;
  user_id: string;
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

// Alias for use in player ClientsSection
export type FriendDetails = Friend;

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
    const response = await apiClient.get('/friends/list');
    // API returns { friends: [...] }, extract the array
    return (response as any)?.friends || [];
  },

  // Send friend request (userId is the user_id string like "A4D2EGUZ")
  sendFriendRequest: async (userIdString: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/friends/request', { receiver_user_id: userIdString });
    return response as any;
  },

  // Get pending friend requests (received)
  getPendingRequests: async (): Promise<FriendRequest[]> => {
    const response = await apiClient.get('/friends/requests/received');
    return response as any;
  },

  // Get sent friend requests
  getSentRequests: async (): Promise<FriendRequest[]> => {
    const response = await apiClient.get('/friends/requests/sent');
    return response as any;
  },

  // Accept friend request
  acceptRequest: async (requestId: number): Promise<{ message: string }> => {
    const response = await apiClient.put(`/friends/requests/${requestId}`, { status: 'accepted' });
    return response as any;
  },

  // Reject friend request
  rejectRequest: async (requestId: number): Promise<{ message: string }> => {
    const response = await apiClient.put(`/friends/requests/${requestId}`, { status: 'rejected' });
    return response as any;
  },

  // Remove friend
  removeFriend: async (friendId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/friends/${friendId}`);
    return response as any;
  },

  // Search users for friend requests (uses friends/search which filters by role)
  searchUsers: async (query: string): Promise<Friend[]> => {
    const response = await apiClient.get('/friends/search', {
      params: { q: query },
    });
    // API returns an array directly
    return response as any || [];
  },

  // Send friend request by numeric user ID
  sendFriendRequestById: async (userId: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/friends/send/${userId}`);
    return response as any;
  },
};
