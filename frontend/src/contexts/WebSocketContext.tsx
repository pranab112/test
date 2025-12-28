import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { wsService, WebSocketMessage, TypingIndicator, OnlineStatus } from '@/services/websocket.service';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  sendMessage: (message: Omit<WebSocketMessage, 'id' | 'timestamp' | 'status'>) => void;
  sendTyping: (roomId: string, isTyping: boolean) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  markAsDelivered: (messageIds: string[]) => void;
  markAsRead: (messageIds: string[]) => void;
  requestOnlineStatus: (userIds: number[]) => void;
  sendBroadcast: (message: string, target: 'all' | 'clients' | 'players', metadata?: any) => void;
  messages: Map<string, WebSocketMessage[]>;
  typingIndicators: Map<string, TypingIndicator[]>;
  onlineUsers: Map<number, OnlineStatus>;
  unreadCounts: Map<string, number>;
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
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [messages, setMessages] = useState<Map<string, WebSocketMessage[]>>(new Map());
  const [typingIndicators, setTypingIndicators] = useState<Map<string, TypingIndicator[]>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Map<number, OnlineStatus>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Initialize WebSocket connection
  useEffect(() => {
    if (user && token) {
      setConnectionStatus('connecting');
      wsService.connect(token, user.id);

      // Setup event listeners
      wsService.on('connected', handleConnected);
      wsService.on('disconnected', handleDisconnected);
      wsService.on('message:new', handleNewMessage);
      wsService.on('message:updated', handleMessageUpdated);
      wsService.on('message:deleted', handleMessageDeleted);
      wsService.on('message:delivered', handleMessageDelivered);
      wsService.on('message:read', handleMessageRead);
      wsService.on('typing:start', handleTypingStart);
      wsService.on('typing:stop', handleTypingStop);
      wsService.on('user:online', handleUserOnline);
      wsService.on('user:offline', handleUserOffline);
      wsService.on('broadcast:new', handleBroadcast);

      return () => {
        wsService.disconnect();
      };
    }
  }, [user, token]);

  const handleConnected = () => {
    setIsConnected(true);
    setConnectionStatus('connected');
  };

  const handleDisconnected = () => {
    setIsConnected(false);
    setConnectionStatus('disconnected');
  };

  const handleNewMessage = (message: WebSocketMessage) => {
    const roomId = message.roomId || `dm-${message.senderId}`;

    setMessages((prev) => {
      const newMessages = new Map(prev);
      const roomMessages = newMessages.get(roomId) || [];
      newMessages.set(roomId, [...roomMessages, message]);
      return newMessages;
    });

    // Update unread count if message is from another user
    if (message.senderId !== user?.id) {
      setUnreadCounts((prev) => {
        const newCounts = new Map(prev);
        const currentCount = newCounts.get(roomId) || 0;
        newCounts.set(roomId, currentCount + 1);
        return newCounts;
      });

      // Show notification for new message
      if (document.hidden) {
        new Notification(`New message from ${message.senderName}`, {
          body: message.content || 'Sent an attachment',
          icon: message.senderAvatar || '/logo.png',
        });
      }
    }
  };

  const handleMessageUpdated = (message: WebSocketMessage) => {
    const roomId = message.roomId || `dm-${message.senderId}`;

    setMessages((prev) => {
      const newMessages = new Map(prev);
      const roomMessages = newMessages.get(roomId) || [];
      const updatedMessages = roomMessages.map((msg) =>
        msg.id === message.id ? message : msg
      );
      newMessages.set(roomId, updatedMessages);
      return newMessages;
    });
  };

  const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
    setMessages((prev) => {
      const newMessages = new Map(prev);
      newMessages.forEach((roomMessages, roomId) => {
        const filteredMessages = roomMessages.filter((msg) => msg.id !== messageId);
        if (filteredMessages.length !== roomMessages.length) {
          newMessages.set(roomId, filteredMessages);
        }
      });
      return newMessages;
    });
  };

  const handleMessageDelivered = ({ messageId, userId }: { messageId: string; userId: number }) => {
    setMessages((prev) => {
      const newMessages = new Map(prev);
      newMessages.forEach((roomMessages, roomId) => {
        const updatedMessages = roomMessages.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'delivered' as const } : msg
        );
        newMessages.set(roomId, updatedMessages);
      });
      return newMessages;
    });
  };

  const handleMessageRead = ({ messageId, userId }: { messageId: string; userId: number }) => {
    setMessages((prev) => {
      const newMessages = new Map(prev);
      newMessages.forEach((roomMessages, roomId) => {
        const updatedMessages = roomMessages.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'read' as const } : msg
        );
        newMessages.set(roomId, updatedMessages);
      });
      return newMessages;
    });
  };

  const handleTypingStart = (indicator: TypingIndicator) => {
    const roomId = indicator.roomId;

    // Clear existing timeout for this user
    const timeoutKey = `${roomId}-${indicator.userId}`;
    if (typingTimeouts.current.has(timeoutKey)) {
      clearTimeout(typingTimeouts.current.get(timeoutKey)!);
    }

    setTypingIndicators((prev) => {
      const newIndicators = new Map(prev);
      const roomIndicators = newIndicators.get(roomId) || [];
      const filtered = roomIndicators.filter((ind) => ind.userId !== indicator.userId);
      newIndicators.set(roomId, [...filtered, indicator]);
      return newIndicators;
    });

    // Auto-remove typing indicator after 3 seconds
    const timeout = setTimeout(() => {
      handleTypingStop(indicator);
    }, 3000);
    typingTimeouts.current.set(timeoutKey, timeout);
  };

  const handleTypingStop = (indicator: TypingIndicator) => {
    const roomId = indicator.roomId;
    const timeoutKey = `${roomId}-${indicator.userId}`;

    // Clear timeout
    if (typingTimeouts.current.has(timeoutKey)) {
      clearTimeout(typingTimeouts.current.get(timeoutKey)!);
      typingTimeouts.current.delete(timeoutKey);
    }

    setTypingIndicators((prev) => {
      const newIndicators = new Map(prev);
      const roomIndicators = newIndicators.get(roomId) || [];
      const filtered = roomIndicators.filter((ind) => ind.userId !== indicator.userId);
      if (filtered.length > 0) {
        newIndicators.set(roomId, filtered);
      } else {
        newIndicators.delete(roomId);
      }
      return newIndicators;
    });
  };

  const handleUserOnline = (status: OnlineStatus) => {
    setOnlineUsers((prev) => {
      const newUsers = new Map(prev);
      newUsers.set(status.userId, status);
      return newUsers;
    });
  };

  const handleUserOffline = (status: OnlineStatus) => {
    setOnlineUsers((prev) => {
      const newUsers = new Map(prev);
      newUsers.set(status.userId, { ...status, isOnline: false, lastSeen: new Date().toISOString() });
      return newUsers;
    });
  };

  const handleBroadcast = (data: any) => {
    toast(data.message, {
      duration: 5000,
      icon: '📢',
    });
  };

  // Context methods
  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'id' | 'timestamp' | 'status'>) => {
    if (user) {
      wsService.sendMessage({
        ...message,
        senderId: user.id,
        senderName: user.username,
        senderAvatar: user.avatar,
      });
    }
  }, [user]);

  const sendTyping = useCallback((roomId: string, isTyping: boolean) => {
    wsService.sendTyping(roomId, isTyping);
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    wsService.joinRoom(roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    wsService.leaveRoom(roomId);
  }, []);

  const markAsDelivered = useCallback((messageIds: string[]) => {
    wsService.markAsDelivered(messageIds);
  }, []);

  const markAsRead = useCallback((messageIds: string[]) => {
    wsService.markAsRead(messageIds);

    // Clear unread count for the room
    messageIds.forEach((messageId) => {
      messages.forEach((roomMessages, roomId) => {
        if (roomMessages.some((msg) => msg.id === messageId)) {
          setUnreadCounts((prev) => {
            const newCounts = new Map(prev);
            newCounts.set(roomId, 0);
            return newCounts;
          });
        }
      });
    });
  }, [messages]);

  const requestOnlineStatus = useCallback((userIds: number[]) => {
    wsService.requestOnlineStatus(userIds);
  }, []);

  const sendBroadcast = useCallback((message: string, target: 'all' | 'clients' | 'players', metadata?: any) => {
    wsService.sendBroadcast(message, target, metadata);
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    connectionStatus,
    sendMessage,
    sendTyping,
    joinRoom,
    leaveRoom,
    markAsDelivered,
    markAsRead,
    requestOnlineStatus,
    sendBroadcast,
    messages,
    typingIndicators,
    onlineUsers,
    unreadCounts,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}