import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import {
  notificationService,
  NotificationData,
  NotificationCategory,
} from '../services/notificationService';
import { settingsApi, NotificationSettings } from '../api/settings.api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  // State
  notifications: NotificationData[];
  unreadCount: number;
  settings: NotificationSettings | null;
  isLoading: boolean;
  pushToken: string | null;

  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  sendLocalNotification: (
    title: string,
    body: string,
    category: NotificationCategory,
    data?: Record<string, any>
  ) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pushToken, setPushToken] = useState<string | null>(null);

  // Initialize notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeNotifications();
    } else {
      // Reset state when logged out
      setNotifications([]);
      setUnreadCount(0);
      setSettings(null);
      setPushToken(null);
    }
  }, [isAuthenticated, user]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && isAuthenticated) {
      // Refresh notifications when app comes to foreground
      await refreshNotifications();
    }
  };

  // Initialize notification system
  const initializeNotifications = async () => {
    setIsLoading(true);
    try {
      // Configure notification service
      await notificationService.configure();

      // Register for push notifications
      const token = await notificationService.registerForPushNotifications();
      setPushToken(token);

      // Load notification settings from backend
      await loadSettings();

      // Load notification history
      await refreshNotifications();

      // Set up listeners
      notificationService.setupListeners(
        handleNotificationReceived,
        handleNotificationResponse
      );
    } catch (error) {
      console.error('Error initializing notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load notification settings from API
  const loadSettings = async () => {
    try {
      const notificationSettings = await settingsApi.getNotificationSettings();
      setSettings(notificationSettings);

      // Sync sound setting with notification service
      await notificationService.setSoundEnabled(notificationSettings.notification_sounds);
    } catch (error) {
      console.error('Error loading notification settings:', error);
      // Set default settings if API fails
      setSettings({
        notification_sounds: true,
        email_notifications: true,
        push_notifications: true,
        promotions_rewards: true,
        friend_requests: true,
        messages: true,
      });
    }
  };

  // Handle received notification
  const handleNotificationReceived = useCallback((notification: NotificationData) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 100));
    setUnreadCount((prev) => prev + 1);
  }, []);

  // Handle notification tap
  const handleNotificationResponse = useCallback((notification: NotificationData) => {
    // Mark as read
    markAsRead(notification.id);

    // Navigate based on category
    navigateToNotification(notification);
  }, []);

  // Navigate to appropriate screen based on notification
  const navigateToNotification = (notification: NotificationData) => {
    const { category, data } = notification;

    switch (category) {
      case 'message':
        if (data?.friendId) {
          router.push(`/chat/${data.friendId}`);
        }
        break;
      case 'credit_transfer':
        if (data?.friendId) {
          router.push(`/chat/${data.friendId}`);
        }
        break;
      case 'friend_request':
        // Navigate to friends screen (based on user type)
        if (user?.user_type === 'client') {
          router.push('/(client)/friends');
        } else {
          router.push('/(player)/friends');
        }
        break;
      case 'friend_accepted':
        // Navigate to profile of the person who accepted
        if (data?.accepter_id) {
          router.push(`/profile/${data.accepter_id}`);
        } else if (user?.user_type === 'client') {
          router.push('/(client)/friends');
        } else {
          router.push('/(player)/friends');
        }
        break;
      case 'promotion':
        // Navigate to promotions
        router.push('/(player)/promotions');
        break;
      case 'claim':
        // Navigate to rewards/claims
        router.push('/(player)/rewards');
        break;
      case 'broadcast':
        // Navigate to broadcasts
        router.push('/(player)/broadcasts');
        break;
      default:
        // Default navigation
        break;
    }
  };

  // Refresh notifications from storage
  const refreshNotifications = async () => {
    try {
      const history = await notificationService.getHistory();
      setNotifications(history);
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  };

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const history = await notificationService.getHistory();
      const updatedHistory = history.map((n) => ({ ...n, isRead: true }));

      // Update storage
      for (const notification of updatedHistory) {
        await notificationService.markAsRead(notification.id);
      }

      setNotifications(updatedHistory);
      setUnreadCount(0);
      await notificationService.setBadgeCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Clear all notifications
  const clearNotifications = async () => {
    try {
      await notificationService.clearHistory();
      await notificationService.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Update notification settings
  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = await settingsApi.updateNotificationSettings(newSettings);
      setSettings(updatedSettings);

      // Sync sound setting with notification service
      if (newSettings.notification_sounds !== undefined) {
        await notificationService.setSoundEnabled(newSettings.notification_sounds);
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  };

  // Send local notification
  const sendLocalNotification = async (
    title: string,
    body: string,
    category: NotificationCategory,
    data?: Record<string, any>
  ) => {
    // Check if notifications are enabled for this category
    if (settings) {
      const shouldNotify = checkCategoryEnabled(category, settings);
      if (!shouldNotify) return;
    }

    await notificationService.scheduleLocalNotification(title, body, category, data);
  };

  // Check if category is enabled in settings
  const checkCategoryEnabled = (
    category: NotificationCategory,
    settings: NotificationSettings
  ): boolean => {
    if (!settings.push_notifications) return false;

    switch (category) {
      case 'message':
        return settings.messages;
      case 'friend_request':
      case 'friend_accepted':
        return settings.friend_requests;
      case 'promotion':
      case 'claim':
        return settings.promotions_rewards;
      default:
        return true;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      notificationService.removeListeners();
    };
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    settings,
    isLoading,
    pushToken,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refreshNotifications,
    updateSettings,
    sendLocalNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
