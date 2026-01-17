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
      // Use URLSearchParams for form-encoded data (more reliable than FormData for non-file uploads)
      const params = new URLSearchParams();
      params.append('receiver_id', receiverId.toString());
      params.append('content', content);

      const response = await api.post(API_ENDPOINTS.CHAT.SEND_TEXT, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
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
      const extension = match ? match[1].toLowerCase() : 'jpg';

      // Map extensions to proper MIME types
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };
      const type = mimeTypes[extension] || 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      } as unknown as Blob);

      if (caption) {
        formData.append('content', caption);
      }

      console.log('[Chat API] Sending image:', { receiverId, filename, type, hasCaption: !!caption });

      // Explicitly set Content-Type to multipart/form-data for React Native
      const response = await api.post(API_ENDPOINTS.CHAT.SEND_IMAGE, formData, {
        timeout: 60000, // 60 seconds for image upload
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('[Chat API] Image sent successfully:', response);
      return response as unknown as Message;
    } catch (error: any) {
      console.error('[Chat API] sendImageMessage error:', error);
      console.error('[Chat API] Error details:', JSON.stringify(error, null, 2));
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

      // Get filename from URI and determine MIME type
      const filename = audioUri.split('/').pop() || 'audio.m4a';
      const extension = filename.split('.').pop()?.toLowerCase() || 'm4a';

      // Map extensions to MIME types the backend accepts
      const mimeTypes: Record<string, string> = {
        'm4a': 'audio/mp4',
        'mp4': 'audio/mp4',
        'mp3': 'audio/mpeg',
        'webm': 'audio/webm',
        'ogg': 'audio/ogg',
        'wav': 'audio/wav',
        'caf': 'audio/x-caf', // iOS Core Audio Format
        'aac': 'audio/aac',
        '3gp': 'audio/3gpp', // Android format
      };
      const mimeType = mimeTypes[extension] || 'audio/mp4';

      formData.append('file', {
        uri: audioUri,
        name: filename,
        type: mimeType,
      } as unknown as Blob);

      // Don't set Content-Type header - let axios set it with proper boundary
      const response = await api.post(API_ENDPOINTS.CHAT.SEND_VOICE, formData);
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
      console.log('[Chat API] getMessages response:', JSON.stringify(response, null, 2));
      return response as unknown as MessageListResponse;
    } catch (error) {
      console.error('[Chat API] getMessages error:', error);
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
