import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { websocketService, WS_EVENTS } from '../services/websocket';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';
import type { Message } from '../types';

interface WebSocketContextType {
  isConnected: boolean;
  newMessage: Message | null;
  typingUsers: Map<number, boolean>;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendTyping: (receiverId: number) => void;
  sendStopTyping: (receiverId: number) => void;
  clearNewMessage: () => void;
  setActiveChat: (friendId: number | null) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [newMessage, setNewMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<number, boolean>>(new Map());
  const appStateRef = useRef(AppState.currentState);
  const activeChatRef = useRef<number | null>(null);

  // Track which chat is currently active to avoid notifications for that chat
  const setActiveChat = useCallback((friendId: number | null) => {
    activeChatRef.current = friendId;
  }, []);

  const connect = useCallback(async () => {
    await websocketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const sendTyping = useCallback((receiverId: number) => {
    websocketService.sendTyping(receiverId);
  }, []);

  const sendStopTyping = useCallback((receiverId: number) => {
    websocketService.sendStopTyping(receiverId);
  }, []);

  const clearNewMessage = useCallback(() => {
    setNewMessage(null);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only depend on isAuthenticated - connect/disconnect are stable

  // Track app state for notification decisions
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Connection status handlers
    const unsubConnect = websocketService.onConnect(() => {
      setIsConnected(true);
    });

    const unsubDisconnect = websocketService.onDisconnect(() => {
      setIsConnected(false);
    });

    // Message handlers - backend sends 'message:new' type
    const unsubNewMessage = websocketService.on('message:new', async (data) => {
      // Backend sends message data directly, not wrapped in data.message
      setNewMessage(data);

      // Show notification if:
      // 1. App is in background, OR
      // 2. User is not in the chat with this sender
      const isFromOtherUser = data.sender_id !== user?.id;
      const isNotInActiveChat = activeChatRef.current !== data.sender_id;
      const shouldNotify = isFromOtherUser && isNotInActiveChat;

      if (shouldNotify) {
        const senderName =
          data.sender_full_name ||
          data.sender_username ||
          data.sender?.full_name ||
          data.sender?.username ||
          data.sender_name ||
          'Someone';
        let notificationBody = '';

        if (data.message_type === 'credit_transfer') {
          const transferType = data.transfer_type === 'add' ? 'sent' : 'deducted';
          notificationBody = `${senderName} ${transferType} ${data.transfer_amount} credits`;
          await notificationService.showNotification(
            'Credit Transfer',
            notificationBody,
            'credit_transfer',
            { friendId: data.sender_id }
          );
        } else if (data.message_type === 'voice') {
          notificationBody = '🎤 Voice message';
          await notificationService.showNotification(
            senderName,
            notificationBody,
            'message',
            { friendId: data.sender_id }
          );
        } else if (data.message_type === 'image') {
          notificationBody = '📷 Image';
          await notificationService.showNotification(
            senderName,
            notificationBody,
            'message',
            { friendId: data.sender_id }
          );
        } else {
          notificationBody = data.content || 'New message';
          await notificationService.showNotification(
            senderName,
            notificationBody,
            'message',
            { friendId: data.sender_id }
          );
        }
      }
    });

    // Friend request notification
    // Backend sends: from_user_id, from_username, from_user_type, from_profile_picture
    const unsubFriendRequest = websocketService.on(WS_EVENTS.FRIEND_REQUEST, async (data) => {
      console.log('[WebSocket] Friend request notification data:', data);
      const senderName = data.from_full_name || data.from_username || 'Someone';
      await notificationService.showNotification(
        'Friend Request',
        `${senderName} sent you a friend request`,
        'friend_request',
        { senderId: data.from_user_id }
      );
    });

    // Friend accepted notification
    // Backend sends: friend_id, friend_username, friend_user_type, friend_profile_picture
    const unsubFriendAccepted = websocketService.on(WS_EVENTS.FRIEND_ACCEPTED, async (data) => {
      console.log('[WebSocket] Friend accepted notification data:', data);
      const friendName = data.friend_full_name || data.friend_username || 'Someone';
      await notificationService.showNotification(
        'Friend Request Accepted',
        `${friendName} accepted your friend request`,
        'friend_accepted',
        { friendId: data.friend_id }
      );
    });

    // Credit update notification
    const unsubCreditUpdate = websocketService.on(WS_EVENTS.CREDIT_UPDATE, async (data) => {
      if (data.type === 'add') {
        await notificationService.showNotification(
          'Credits Received',
          `You received ${data.amount} credits`,
          'credit_transfer',
          { amount: data.amount }
        );
      }
    });

    // Typing indicators - backend sends 'typing:start' and 'typing:stop'
    const unsubTyping = websocketService.on('typing:start', (data) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.user_id, true);
        return newMap;
      });
    });

    const unsubStopTyping = websocketService.on('typing:stop', (data) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.user_id);
        return newMap;
      });
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubNewMessage();
      unsubFriendRequest();
      unsubFriendAccepted();
      unsubCreditUpdate();
      unsubTyping();
      unsubStopTyping();
    };
  }, [user?.id]);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        newMessage,
        typingUsers,
        connect,
        disconnect,
        sendTyping,
        sendStopTyping,
        clearNewMessage,
        setActiveChat,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
