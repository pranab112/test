import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { chatApi } from '../api/chat.api';
import { useAuth } from './AuthContext';
import { websocketService } from '../services/websocket';

interface ChatContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: (count?: number) => void;
  incrementUnreadCount: (count?: number) => void;
  resetUnreadCount: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const stats = await chatApi.getChatStats();
      setUnreadCount(stats.unread_messages || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  const decrementUnreadCount = useCallback((count: number = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - count));
  }, []);

  const incrementUnreadCount = useCallback((count: number = 1) => {
    setUnreadCount((prev) => prev + count);
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Fetch unread count on mount and when user changes
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Refresh unread count periodically (every 30 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, refreshUnreadCount]);

  // Listen for new messages via WebSocket and increment unread count
  useEffect(() => {
    if (!user) return;

    // Backend sends 'message:new' type with message data directly (not wrapped in data.message)
    const unsubscribe = websocketService.on('message:new', (data) => {
      // Only increment if the message is from someone else (not sent by current user)
      if (data && data.sender_id !== user.id) {
        incrementUnreadCount(1);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, incrementUnreadCount]);

  return (
    <ChatContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        decrementUnreadCount,
        incrementUnreadCount,
        resetUnreadCount,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
