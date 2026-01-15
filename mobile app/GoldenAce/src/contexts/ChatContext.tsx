import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { chatApi } from '../api/chat.api';
import { useAuth } from './AuthContext';

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
