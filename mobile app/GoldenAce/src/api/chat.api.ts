import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';
import type { Message, Conversation, MessageListResponse } from '../types';

interface ChatStats {
  messages_sent: number;
  messages_received: number;
  total_messages: number;
  unread_messages: number;
  unique_conversations: number;
}

export const chatApi = {
  // Send text message
  sendTextMessage: async (receiverId: number, content: string): Promise<Message> => {
    try {
      const formData = new FormData();
      formData.append('receiver_id', receiverId.toString());
      formData.append('content', content);

      const response = await api.post(API_ENDPOINTS.CHAT.SEND_TEXT, formData);
      return response as unknown as Message;
    } catch (error) {
      throw error;
    }
  },

  // Send image message
  sendImageMessage: async (
    receiverId: number,
    imageUri: string,
    caption?: string
  ): Promise<Message> => {
    try {
      const formData = new FormData();
      formData.append('receiver_id', receiverId.toString());

      // Get filename and type from URI
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      } as unknown as Blob);

      if (caption) {
        formData.append('caption', caption);
      }

      const response = await api.post(API_ENDPOINTS.CHAT.SEND_IMAGE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response as unknown as Message;
    } catch (error) {
      throw error;
    }
  },

  // Send voice message
  sendVoiceMessage: async (
    receiverId: number,
    audioUri: string,
    duration: number
  ): Promise<Message> => {
    try {
      const formData = new FormData();
      formData.append('receiver_id', receiverId.toString());
      formData.append('duration', duration.toString());

      // Get filename from URI
      const filename = audioUri.split('/').pop() || 'audio.m4a';

      formData.append('file', {
        uri: audioUri,
        name: filename,
        type: 'audio/m4a',
      } as unknown as Blob);

      const response = await api.post(API_ENDPOINTS.CHAT.SEND_VOICE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response as unknown as Message;
    } catch (error) {
      throw error;
    }
  },

  // Get conversations
  getConversations: async (): Promise<Conversation[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.CHAT.CONVERSATIONS);
      return response as unknown as Conversation[];
    } catch (error) {
      throw error;
    }
  },

  // Get messages with a friend
  getMessages: async (friendId: number, skip = 0, limit = 50): Promise<MessageListResponse> => {
    try {
      const response = await api.get(`${API_ENDPOINTS.CHAT.MESSAGES}/${friendId}`, {
        params: { skip, limit },
      });
      return response as unknown as MessageListResponse;
    } catch (error) {
      throw error;
    }
  },

  // Mark message as read
  markMessageAsRead: async (messageId: number): Promise<void> => {
    try {
      await api.put(`${API_ENDPOINTS.CHAT.MESSAGES}/${messageId}/read`);
    } catch (error) {
      throw error;
    }
  },

  // Delete message
  deleteMessage: async (messageId: number): Promise<void> => {
    try {
      await api.delete(`${API_ENDPOINTS.CHAT.MESSAGES}/${messageId}`);
    } catch (error) {
      throw error;
    }
  },

  // Get chat stats
  getChatStats: async (): Promise<ChatStats> => {
    try {
      const response = await api.get(API_ENDPOINTS.CHAT.STATS);
      return response as unknown as ChatStats;
    } catch (error) {
      throw error;
    }
  },
};
