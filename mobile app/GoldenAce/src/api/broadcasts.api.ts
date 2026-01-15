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

// Backend response structure
interface BroadcastsResponse {
  broadcasts: Array<{
    id: number;
    content: string;
    is_read: boolean;
    created_at: string | null;
  }>;
  total: number;
  unread: number;
}

const BROADCAST_ENDPOINTS = {
  LIST: '/chat/broadcasts',
  MARK_READ: (id: number) => `/chat/broadcasts/${id}/read`,
  MARK_ALL_READ: '/chat/broadcasts/read-all',
};

export const broadcastsApi = {
  // Get all broadcasts
  getBroadcasts: async (): Promise<Broadcast[]> => {
    try {
      const response = await api.get(BROADCAST_ENDPOINTS.LIST) as unknown as BroadcastsResponse;

      // Transform backend response to match Broadcast interface
      const broadcasts: Broadcast[] = (response.broadcasts || []).map((b) => ({
        id: b.id,
        title: 'Announcement', // Backend doesn't provide separate title
        content: b.content,
        broadcast_type: 'announcement' as const,
        priority: 'medium' as const, // Backend doesn't provide priority, default to medium
        is_read: b.is_read,
        created_at: b.created_at || new Date().toISOString(),
      }));

      return broadcasts;
    } catch (error) {
      throw error;
    }
  },

  // Mark single broadcast as read
  markAsRead: async (broadcastId: number): Promise<{ message: string }> => {
    try {
      const response = await api.put(BROADCAST_ENDPOINTS.MARK_READ(broadcastId));
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Mark all broadcasts as read
  markAllAsRead: async (): Promise<{ message: string }> => {
    try {
      const response = await api.put(BROADCAST_ENDPOINTS.MARK_ALL_READ);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },
};
