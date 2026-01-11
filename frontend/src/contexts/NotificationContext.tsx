import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useAuth } from './AuthContext';
import { notificationService } from '@/services/notification.service';

export interface NotificationCounts {
  messages: number;
  promotions: number;
  friends: number;
  reports: number;
  approvals: number;
}

interface NotificationContextType {
  counts: NotificationCounts;
  totalCount: number;
  incrementCount: (section: keyof NotificationCounts) => void;
  decrementCount: (section: keyof NotificationCounts, amount?: number) => void;
  clearCount: (section: keyof NotificationCounts) => void;
  setCount: (section: keyof NotificationCounts, count: number) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const { totalUnreadMessages } = useWebSocket();

  const [counts, setCounts] = useState<NotificationCounts>({
    messages: 0,
    promotions: 0,
    friends: 0,
    reports: 0,
    approvals: 0,
  });

  const [soundEnabled, setSoundEnabledState] = useState(() => {
    return notificationService.isSoundEnabled();
  });

  // Sync message count with WebSocket context
  useEffect(() => {
    setCounts(prev => ({
      ...prev,
      messages: totalUnreadMessages,
    }));
  }, [totalUnreadMessages]);

  // Reset counts when user changes
  useEffect(() => {
    if (!user) {
      setCounts({
        messages: 0,
        promotions: 0,
        friends: 0,
        reports: 0,
        approvals: 0,
      });
    }
  }, [user]);

  const incrementCount = useCallback((section: keyof NotificationCounts) => {
    setCounts(prev => ({
      ...prev,
      [section]: prev[section] + 1,
    }));
  }, []);

  const decrementCount = useCallback((section: keyof NotificationCounts, amount: number = 1) => {
    setCounts(prev => ({
      ...prev,
      [section]: Math.max(0, prev[section] - amount),
    }));
  }, []);

  const clearCount = useCallback((section: keyof NotificationCounts) => {
    setCounts(prev => ({
      ...prev,
      [section]: 0,
    }));
  }, []);

  const setCount = useCallback((section: keyof NotificationCounts, count: number) => {
    setCounts(prev => ({
      ...prev,
      [section]: count,
    }));
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    notificationService.setSoundEnabled(enabled);
  }, []);

  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const value: NotificationContextType = {
    counts,
    totalCount,
    incrementCount,
    decrementCount,
    clearCount,
    setCount,
    soundEnabled,
    setSoundEnabled,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
