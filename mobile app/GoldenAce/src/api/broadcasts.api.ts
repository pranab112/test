import { api } from '../services/api';

export interface Broadcast {
  id: number;
  title: string;
  content: string;
  broadcast_type: 'announcement' | 'promotion' | 'maintenance' | 'update';
  priority: 'low' | 'medium' | 'high';
  is_read: boolean;
  created_at: string;
  expires_at?: string;
  sender_id?: number;
  sender_username?: string;
}

const BROADCAST_ENDPOINTS = {
  LIST: '/chat/broadcasts',
  MARK_READ: (id: number) => `/chat/broadcasts/${id}/read`,
  MARK_ALL_READ: '/chat/broadcasts/read-all',
};

export const broadcastsApi = {
  // Get all broadcasts
  getBroadcasts: async (): Promise<Broadcast[]> => {
    const response = await api.get(BROADCAST_ENDPOINTS.LIST);
    return response as unknown as Broadcast[];
  },

  // Mark single broadcast as read
  markAsRead: async (broadcastId: number): Promise<{ message: string }> => {
    const response = await api.put(BROADCAST_ENDPOINTS.MARK_READ(broadcastId));
    return response as unknown as { message: string };
  },

  // Mark all broadcasts as read
  markAllAsRead: async (): Promise<{ message: string }> => {
    const response = await api.put(BROADCAST_ENDPOINTS.MARK_ALL_READ);
    return response as unknown as { message: string };
  },
};
