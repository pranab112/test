import { apiClient } from '../client';

// Message types
export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  content_type: 'text' | 'image' | 'voice';
  image_url?: string;
  voice_url?: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
  };
}

export interface MessageResponse extends Message {}

export interface Conversation {
  friend_id: number;
  friend_username: string;
  friend_full_name: string;
  friend_profile_picture?: string;
  friend_online: boolean;
  last_message?: Message;
  unread_count: number;
  last_message_time?: string;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  page: number;
  per_page: number;
}

export interface SendMessageRequest {
  receiver_id: number;
  content: string;
}

export interface ChatStats {
  total_messages: number;
  unread_messages: number;
  total_conversations: number;
}

export const chatApi = {
  // Send text message
  sendTextMessage: async (data: SendMessageRequest): Promise<MessageResponse> => {
    const response = await apiClient.post('/chat/send/text', data);
    return response as any;
  },

  // Send image message
  sendImageMessage: async (receiverId: number, image: File): Promise<MessageResponse> => {
    const formData = new FormData();
    formData.append('receiver_id', receiverId.toString());
    formData.append('image', image);

    const response = await apiClient.post('/chat/send/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response as any;
  },

  // Send voice message
  sendVoiceMessage: async (receiverId: number, voice: File): Promise<MessageResponse> => {
    const formData = new FormData();
    formData.append('receiver_id', receiverId.toString());
    formData.append('voice', voice);

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
  getMessages: async (friendId: number, page = 1, perPage = 50): Promise<MessageListResponse> => {
    const response = await apiClient.get(`/chat/messages/${friendId}`, {
      params: { page, per_page: perPage },
    });
    return response as any;
  },

  // Mark message as read
  markMessageAsRead: async (messageId: number): Promise<void> => {
    await apiClient.put(`/chat/messages/${messageId}/read`);
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