import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';
import type { Message, Conversation, MessageListResponse } from '../types';

export const chatApi = {
  // Send text message
  sendTextMessage: async (receiverId: number, content: string): Promise<Message> => {
    const formData = new FormData();
    formData.append('receiver_id', receiverId.toString());
    formData.append('content', content);

    const response = await api.post(API_ENDPOINTS.CHAT.SEND_TEXT, formData);
    return response as any;
  },

  // Send image message
  sendImageMessage: async (
    receiverId: number,
    imageUri: string,
    caption?: string
  ): Promise<Message> => {
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
    } as any);

    if (caption) {
      formData.append('caption', caption);
    }

    const response = await api.post(API_ENDPOINTS.CHAT.SEND_IMAGE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response as any;
  },

  // Send voice message
  sendVoiceMessage: async (
    receiverId: number,
    audioUri: string,
    duration: number
  ): Promise<Message> => {
    const formData = new FormData();
    formData.append('receiver_id', receiverId.toString());
    formData.append('duration', duration.toString());

    // Get filename from URI
    const filename = audioUri.split('/').pop() || 'audio.m4a';

    formData.append('file', {
      uri: audioUri,
      name: filename,
      type: 'audio/m4a',
    } as any);

    const response = await api.post(API_ENDPOINTS.CHAT.SEND_VOICE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response as any;
  },

  // Get conversations
  getConversations: async (): Promise<Conversation[]> => {
    const response = await api.get(API_ENDPOINTS.CHAT.CONVERSATIONS);
    return response as unknown as Conversation[];
  },

  // Get messages with a friend
  getMessages: async (friendId: number, skip = 0, limit = 50): Promise<MessageListResponse> => {
    const response = await api.get(`${API_ENDPOINTS.CHAT.MESSAGES}/${friendId}`, {
      params: { skip, limit },
    });
    return response as unknown as MessageListResponse;
  },

  // Mark message as read
  markMessageAsRead: async (messageId: number): Promise<void> => {
    await api.put(`${API_ENDPOINTS.CHAT.MESSAGES}/${messageId}/read`);
  },

  // Delete message
  deleteMessage: async (messageId: number): Promise<void> => {
    await api.delete(`${API_ENDPOINTS.CHAT.MESSAGES}/${messageId}`);
  },

  // Get chat stats
  getChatStats: async (): Promise<{
    messages_sent: number;
    messages_received: number;
    total_messages: number;
    unread_messages: number;
    unique_conversations: number;
  }> => {
    const response = await api.get(API_ENDPOINTS.CHAT.STATS);
    return response as any;
  },
};
