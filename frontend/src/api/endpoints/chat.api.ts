import { apiClient } from '../client';

// Message types
export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  message_type: 'text' | 'image' | 'voice' | 'promotion';
  content?: string;
  file_url?: string;
  file_name?: string;
  duration?: number;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: number;
    username: string;
    full_name?: string;
    profile_picture?: string;
  };
}

export interface MessageResponse extends Message {}

export interface Friend {
  id: number;
  username: string;
  full_name?: string;
  profile_picture?: string;
  user_type?: string;
  is_online?: boolean;
  last_seen?: string;
}

export interface Conversation {
  friend: Friend;
  last_message?: Message;
  unread_count: number;
}

export interface MessageListResponse {
  messages: Message[];
  unread_count: number;
}

export interface SendMessageRequest {
  receiver_id: number;
  content: string;
}

export interface ChatStats {
  messages_sent: number;
  messages_received: number;
  total_messages: number;
  unread_messages: number;
  unique_conversations: number;
}

export const chatApi = {
  // Send text message
  sendTextMessage: async (receiverId: number, content: string): Promise<MessageResponse> => {
    const formData = new FormData();
    formData.append('receiver_id', receiverId.toString());
    formData.append('content', content);

    const response = await apiClient.post('/chat/send/text', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response as any;
  },

  // Send image message
  sendImageMessage: async (receiverId: number, file: File): Promise<MessageResponse> => {
    const formData = new FormData();
    formData.append('receiver_id', receiverId.toString());
    formData.append('file', file);

    const response = await apiClient.post('/chat/send/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response as any;
  },

  // Send voice message
  sendVoiceMessage: async (receiverId: number, file: File, duration: number): Promise<MessageResponse> => {
    const formData = new FormData();
    formData.append('receiver_id', receiverId.toString());
    formData.append('file', file);
    formData.append('duration', duration.toString());

    const response = await apiClient.post('/chat/send/voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response as any;
  },

  // Get conversations
  getConversations: async (): Promise<Conversation[]> => {
    const response = await apiClient.get('/chat/conversations');
    return response as any;
  },

  // Get messages with a friend
  getMessages: async (friendId: number, skip = 0, limit = 50): Promise<MessageListResponse> => {
    const response = await apiClient.get(`/chat/messages/${friendId}`, {
      params: { skip, limit },
    });
    return response as any;
  },

  // Mark message as read
  markMessageAsRead: async (messageId: number): Promise<void> => {
    await apiClient.put(`/chat/messages/${messageId}/read`);
  },

  // Mark multiple messages as read
  markMessagesAsRead: async (messageIds: number[]): Promise<void> => {
    await Promise.all(messageIds.map((id) => apiClient.put(`/chat/messages/${id}/read`)));
  },

  // Delete message
  deleteMessage: async (messageId: number): Promise<void> => {
    await apiClient.delete(`/chat/messages/${messageId}`);
  },

  // Get chat stats
  getChatStats: async (): Promise<ChatStats> => {
    const response = await apiClient.get('/chat/stats');
    return response as any;
  },
};
