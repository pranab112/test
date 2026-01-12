import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  wsService,
  WSMessageType,
  ChatMessage,
  TypingIndicator,
  OnlineStatus,
  UserStatusResponse,
} from '@/services/websocket.service';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { notificationService } from '@/services/notification.service';

interface WebSocketContextType {
  // Connection state
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';

  // Message operations
  sendMessage: (receiverId: number, content: string, messageType?: string) => void;
  sendFileMessage: (
    receiverId: number,
    fileUrl: string,
    fileName: string,
    messageType: 'image' | 'voice',
    duration?: number
  ) => void;
  markAsRead: (messageIds: number[], senderId: number) => void;

  // Typing operations
  sendTyping: (receiverId: number, isTyping: boolean) => void;

  // Room operations
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;

  // Status operations
  requestOnlineStatus: (userIds: number[]) => void;

  // State
  messages: Map<string, ChatMessage[]>;
  typingIndicators: Map<string, TypingIndicator[]>;
  onlineUsers: Map<number, OnlineStatus>;
  unreadCounts: Map<string, number>;

  // Helpers
  getRoomId: (otherUserId: number) => string;
  addMessage: (roomId: string, message: ChatMessage) => void;
  clearUnread: (roomId: string) => void;

  // Total unread count for badges
  totalUnreadMessages: number;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(new Map());
  const [typingIndicators, setTypingIndicators] = useState<Map<string, TypingIndicator[]>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Map<number, OnlineStatus>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Get room ID for direct messages
  const getRoomId = useCallback((otherUserId: number): string => {
    if (!user) return '';
    return `dm-${Math.min(user.id, otherUserId)}-${Math.max(user.id, otherUserId)}`;
  }, [user]);

  // Add message to state
  const addMessage = useCallback((roomId: string, message: ChatMessage) => {
    setMessages((prev) => {
      const newMessages = new Map(prev);
      const roomMessages = newMessages.get(roomId) || [];

      // Check for duplicate
      if (roomMessages.some((m) => m.id === message.id)) {
        return prev;
      }

      newMessages.set(roomId, [...roomMessages, message]);
      return newMessages;
    });
  }, []);

  // Clear unread count for a room
  const clearUnread = useCallback((roomId: string) => {
    setUnreadCounts((prev) => {
      const newCounts = new Map(prev);
      newCounts.set(roomId, 0);
      return newCounts;
    });
  }, []);

  // Handle new message
  const handleNewMessage = useCallback((data: unknown) => {
    const messageData = data as ChatMessage;
    const roomId = messageData.room_id;

    addMessage(roomId, messageData);

    // Update unread count if message is from another user
    if (messageData.sender_id !== user?.id) {
      setUnreadCounts((prev) => {
        const newCounts = new Map(prev);
        const currentCount = newCounts.get(roomId) || 0;
        newCounts.set(roomId, currentCount + 1);
        return newCounts;
      });

      // Play notification sound
      const isPromotion = messageData.message_type === 'promotion';
      notificationService.playNotificationSound(isPromotion ? 'promotion' : 'message');

      // Show notification if tab is hidden
      if (document.hidden) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`New message from ${messageData.sender_name}`, {
            body: messageData.content || 'Sent an attachment',
            icon: messageData.sender_avatar || '/logo.png',
          });
        }
      } else {
        toast(`${messageData.sender_name}: ${messageData.content || 'Sent an attachment'}`, {
          icon: isPromotion ? '🎁' : '💬',
          duration: 3000,
        });
      }
    }
  }, [user, addMessage]);

  // Handle message delivered
  const handleMessageDelivered = useCallback((data: unknown) => {
    const { message_id, status } = data as { message_id: number; status: string };

    setMessages((prev) => {
      const newMessages = new Map(prev);
      newMessages.forEach((roomMessages, roomId) => {
        const updatedMessages = roomMessages.map((msg) =>
          msg.id === message_id ? { ...msg, status: status as ChatMessage['status'] } : msg
        );
        newMessages.set(roomId, updatedMessages);
      });
      return newMessages;
    });
  }, []);

  // Handle message read
  const handleMessageRead = useCallback((data: unknown) => {
    const { message_ids } = data as { message_ids: number[]; reader_id: number };

    setMessages((prev) => {
      const newMessages = new Map(prev);
      newMessages.forEach((roomMessages, roomId) => {
        const updatedMessages = roomMessages.map((msg) =>
          message_ids.includes(msg.id as number) ? { ...msg, is_read: true, status: 'read' as const } : msg
        );
        newMessages.set(roomId, updatedMessages);
      });
      return newMessages;
    });
  }, []);

  // Handle typing start
  const handleTypingStart = useCallback((data: unknown) => {
    const indicator = data as TypingIndicator;
    const roomId = indicator.room_id;
    const timeoutKey = `${roomId}-${indicator.user_id}`;

    // Clear existing timeout
    if (typingTimeouts.current.has(timeoutKey)) {
      clearTimeout(typingTimeouts.current.get(timeoutKey)!);
    }

    setTypingIndicators((prev) => {
      const newIndicators = new Map(prev);
      const roomIndicators = newIndicators.get(roomId) || [];
      const filtered = roomIndicators.filter((ind) => ind.user_id !== indicator.user_id);
      newIndicators.set(roomId, [...filtered, indicator]);
      return newIndicators;
    });

    // Auto-remove after 3 seconds
    const timeout = setTimeout(() => {
      setTypingIndicators((prev) => {
        const newIndicators = new Map(prev);
        const roomIndicators = newIndicators.get(roomId) || [];
        const filtered = roomIndicators.filter((ind) => ind.user_id !== indicator.user_id);
        if (filtered.length > 0) {
          newIndicators.set(roomId, filtered);
        } else {
          newIndicators.delete(roomId);
        }
        return newIndicators;
      });
      typingTimeouts.current.delete(timeoutKey);
    }, 3000);

    typingTimeouts.current.set(timeoutKey, timeout);
  }, []);

  // Handle typing stop
  const handleTypingStop = useCallback((data: unknown) => {
    const indicator = data as TypingIndicator;
    const roomId = indicator.room_id;
    const timeoutKey = `${roomId}-${indicator.user_id}`;

    if (typingTimeouts.current.has(timeoutKey)) {
      clearTimeout(typingTimeouts.current.get(timeoutKey)!);
      typingTimeouts.current.delete(timeoutKey);
    }

    setTypingIndicators((prev) => {
      const newIndicators = new Map(prev);
      const roomIndicators = newIndicators.get(roomId) || [];
      const filtered = roomIndicators.filter((ind) => ind.user_id !== indicator.user_id);
      if (filtered.length > 0) {
        newIndicators.set(roomId, filtered);
      } else {
        newIndicators.delete(roomId);
      }
      return newIndicators;
    });
  }, []);

  // Handle user online
  const handleUserOnline = useCallback((data: unknown) => {
    const status = data as OnlineStatus;
    setOnlineUsers((prev) => {
      const newUsers = new Map(prev);
      newUsers.set(status.user_id, { ...status, is_online: true });
      return newUsers;
    });

    toast(`${status.username || 'User'} is now online`, {
      icon: '🟢',
      duration: 2000,
    });
  }, []);

  // Handle user offline
  const handleUserOffline = useCallback((data: unknown) => {
    const status = data as OnlineStatus;
    setOnlineUsers((prev) => {
      const newUsers = new Map(prev);
      newUsers.set(status.user_id, {
        ...status,
        is_online: false,
        last_seen: new Date().toISOString(),
      });
      return newUsers;
    });
  }, []);

  // Handle user status response
  const handleUserStatusResponse = useCallback((data: unknown) => {
    const { statuses } = data as UserStatusResponse;
    setOnlineUsers((prev) => {
      const newUsers = new Map(prev);
      statuses.forEach((status) => {
        newUsers.set(status.user_id, status);
      });
      return newUsers;
    });
  }, []);

  // Handle friend request notification
  const handleFriendRequest = useCallback((data: unknown) => {
    const { from_username } = data as { from_username: string };
    notificationService.playNotificationSound('alert');
    toast(`${from_username} sent you a friend request!`, {
      icon: '👋',
      duration: 5000,
    });
  }, []);

  // Handle friend accepted notification
  const handleFriendAccepted = useCallback((data: unknown) => {
    const { friend_username } = data as { friend_username: string };
    notificationService.playNotificationSound('promotion');
    toast(`${friend_username} accepted your friend request!`, {
      icon: '🎉',
      duration: 5000,
    });
  }, []);

  // Handle general notification
  const handleNotification = useCallback((data: unknown) => {
    const { message, notification_type } = data as { notification_type: string; message?: string };
    if (message) {
      // Play sound based on notification type
      if (notification_type === 'promotion') {
        notificationService.playNotificationSound('promotion');
      } else {
        notificationService.playNotificationSound('alert');
      }
      toast(message, {
        icon: '🔔',
        duration: 4000,
      });
    }
  }, []);

  // Initialize WebSocket connection
  // Only depend on user.id to prevent reconnection when user object updates
  const userId = user?.id;
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (userId && token) {
      setConnectionStatus('connecting');
      wsService.connect(token, userId);

      // Setup event listeners
      const handleConnected = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
      };

      const handleDisconnected = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
      };

      const handleError = (data: unknown) => {
        console.error('WebSocket error:', data);
        toast.error('Connection error. Trying to reconnect...', { duration: 3000 });
      };

      const handleReconnectFailed = () => {
        toast.error('Failed to connect. Please refresh the page.', { duration: 5000 });
      };

      wsService.on('connected', handleConnected);
      wsService.on('disconnected', handleDisconnected);
      wsService.on('error', handleError);
      wsService.on('reconnect_failed', handleReconnectFailed);
      wsService.on(WSMessageType.MESSAGE_NEW, handleNewMessage);
      wsService.on(WSMessageType.MESSAGE_DELIVERED, handleMessageDelivered);
      wsService.on(WSMessageType.MESSAGE_READ, handleMessageRead);
      wsService.on(WSMessageType.TYPING_START, handleTypingStart);
      wsService.on(WSMessageType.TYPING_STOP, handleTypingStop);
      wsService.on(WSMessageType.USER_ONLINE, handleUserOnline);
      wsService.on(WSMessageType.USER_OFFLINE, handleUserOffline);
      wsService.on(WSMessageType.USER_STATUS_RESPONSE, handleUserStatusResponse);
      wsService.on(WSMessageType.FRIEND_REQUEST, handleFriendRequest);
      wsService.on(WSMessageType.FRIEND_ACCEPTED, handleFriendAccepted);
      wsService.on(WSMessageType.NOTIFICATION, handleNotification);

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      return () => {
        wsService.off('connected', handleConnected);
        wsService.off('disconnected', handleDisconnected);
        wsService.off('error', handleError);
        wsService.off('reconnect_failed', handleReconnectFailed);
        wsService.off(WSMessageType.MESSAGE_NEW, handleNewMessage);
        wsService.off(WSMessageType.MESSAGE_DELIVERED, handleMessageDelivered);
        wsService.off(WSMessageType.MESSAGE_READ, handleMessageRead);
        wsService.off(WSMessageType.TYPING_START, handleTypingStart);
        wsService.off(WSMessageType.TYPING_STOP, handleTypingStop);
        wsService.off(WSMessageType.USER_ONLINE, handleUserOnline);
        wsService.off(WSMessageType.USER_OFFLINE, handleUserOffline);
        wsService.off(WSMessageType.USER_STATUS_RESPONSE, handleUserStatusResponse);
        wsService.off(WSMessageType.FRIEND_REQUEST, handleFriendRequest);
        wsService.off(WSMessageType.FRIEND_ACCEPTED, handleFriendAccepted);
        wsService.off(WSMessageType.NOTIFICATION, handleNotification);
        wsService.disconnect();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Context methods
  const sendMessage = useCallback((receiverId: number, content: string, messageType: string = 'text') => {
    wsService.sendMessage(receiverId, content, messageType);
  }, []);

  const sendFileMessage = useCallback((
    receiverId: number,
    fileUrl: string,
    fileName: string,
    messageType: 'image' | 'voice',
    duration?: number
  ) => {
    wsService.sendFileMessage(receiverId, fileUrl, fileName, messageType, duration);
  }, []);

  const sendTyping = useCallback((receiverId: number, isTyping: boolean) => {
    wsService.sendTyping(receiverId, isTyping);
  }, []);

  const markAsRead = useCallback((messageIds: number[], senderId: number) => {
    wsService.markAsRead(messageIds, senderId);
  }, []);

  const requestOnlineStatus = useCallback((userIds: number[]) => {
    wsService.requestOnlineStatus(userIds);
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    wsService.joinRoom(roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    wsService.leaveRoom(roomId);
  }, []);

  // Calculate total unread messages across all rooms
  const totalUnreadMessages = Array.from(unreadCounts.values()).reduce((sum, count) => sum + count, 0);

  const value: WebSocketContextType = {
    isConnected,
    connectionStatus,
    sendMessage,
    sendFileMessage,
    sendTyping,
    joinRoom,
    leaveRoom,
    markAsRead,
    requestOnlineStatus,
    messages,
    typingIndicators,
    onlineUsers,
    unreadCounts,
    getRoomId,
    addMessage,
    clearUnread,
    totalUnreadMessages,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
