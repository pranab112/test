import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Notification categories
export type NotificationCategory =
  | 'message'
  | 'credit_transfer'
  | 'friend_request'
  | 'friend_accepted'
  | 'promotion'
  | 'broadcast'
  | 'claim'
  | 'system';

export interface NotificationData {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: Date;
  isRead: boolean;
}

// Storage keys
const STORAGE_KEYS = {
  SOUND_ENABLED: '@notification_sound_enabled',
  NOTIFICATION_HISTORY: '@notification_history',
};

// Notification settings
const MIN_SOUND_INTERVAL = 2000; // Minimum 2 seconds between sounds

class NotificationService {
  private static instance: NotificationService;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private lastSoundTime: number = 0;
  private soundEnabled: boolean = true;
  private onNotificationReceived: ((notification: NotificationData) => void) | null = null;
  private onNotificationResponse: ((notification: NotificationData) => void) | null = null;
  private isConfigured: boolean = false;

  private constructor() {
    this.initializeSoundSettings();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async initializeSoundSettings() {
    try {
      const soundEnabled = await AsyncStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
      this.soundEnabled = soundEnabled !== 'false';
    } catch (error) {
      console.error('[Notification] Error loading sound settings:', error);
    }
  }

  // Configure notification handler behavior
  async configure() {
    if (this.isConfigured) {
      console.log('[Notification] Already configured');
      return;
    }

    console.log('[Notification] Configuring notification service...');

    // Set notification handler for foreground notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: this.soundEnabled,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Configure notification channels for Android
    if (Platform.OS === 'android') {
      await this.createNotificationChannels();
    }

    this.isConfigured = true;
    console.log('[Notification] Configuration complete');
  }

  // Create Android notification channels
  private async createNotificationChannels() {
    console.log('[Notification] Creating Android notification channels...');

    // Default channel with sound
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D09C',
      sound: 'default',
    });

    // Messages channel
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D09C',
      sound: 'default',
    });

    // Credit transfers channel
    await Notifications.setNotificationChannelAsync('credits', {
      name: 'Credit Transfers',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500],
      lightColor: '#00D09C',
      sound: 'default',
    });

    // Promotions channel
    await Notifications.setNotificationChannelAsync('promotions', {
      name: 'Promotions & Rewards',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#00D09C',
      sound: 'default',
    });

    // Friends channel
    await Notifications.setNotificationChannelAsync('friends', {
      name: 'Friend Requests',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D09C',
      sound: 'default',
    });

    // Broadcasts channel
    await Notifications.setNotificationChannelAsync('broadcasts', {
      name: 'Broadcasts',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
    });

    console.log('[Notification] Android channels created');
  }

  // Request notification permission (no push token needed)
  async requestPermission(): Promise<boolean> {
    console.log('[Notification] Requesting permission...');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const granted = finalStatus === 'granted';
    console.log('[Notification] Permission:', granted ? 'granted' : 'denied');
    return granted;
  }

  // Set up notification listeners
  setupListeners(
    onReceived: (notification: NotificationData) => void,
    onResponse: (notification: NotificationData) => void
  ) {
    console.log('[Notification] Setting up listeners...');
    this.onNotificationReceived = onReceived;
    this.onNotificationResponse = onResponse;

    // Listener for received notifications (foreground)
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Notification] Received in foreground:', notification.request.content.title);
        const notificationData = this.parseNotification(notification);
        if (this.onNotificationReceived) {
          this.onNotificationReceived(notificationData);
        }
      }
    );

    // Listener for notification responses (taps)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[Notification] User tapped notification');
        const notificationData = this.parseNotification(response.notification);
        if (this.onNotificationResponse) {
          this.onNotificationResponse(notificationData);
        }
      }
    );

    console.log('[Notification] Listeners set up');
  }

  // Remove listeners
  removeListeners() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    console.log('[Notification] Listeners removed');
  }

  // Parse notification to our format
  private parseNotification(notification: Notifications.Notification): NotificationData {
    const { title, body, data } = notification.request.content;
    return {
      id: notification.request.identifier,
      category: (data?.category as NotificationCategory) || 'system',
      title: title || '',
      body: body || '',
      data: data as Record<string, any>,
      timestamp: new Date(notification.date),
      isRead: false,
    };
  }

  // Schedule local notification - this is the main method to show notifications
  async showNotification(
    title: string,
    body: string,
    category: NotificationCategory,
    data?: Record<string, any>
  ): Promise<string> {
    // Check sound rate limiting
    const now = Date.now();
    const shouldPlaySound = this.soundEnabled && (now - this.lastSoundTime >= MIN_SOUND_INTERVAL);
    if (shouldPlaySound) {
      this.lastSoundTime = now;
    }

    const channelId = this.getChannelForCategory(category);

    console.log('[Notification] Showing notification:', { title, category, channelId });

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...data, category },
        sound: shouldPlaySound ? 'default' : undefined,
      },
      trigger: null, // null = immediate
    });

    // Save to history
    const notificationData: NotificationData = {
      id: notificationId,
      category,
      title,
      body,
      data,
      timestamp: new Date(),
      isRead: false,
    };
    await this.saveToHistory([notificationData]);

    return notificationId;
  }

  // Get channel ID for category
  private getChannelForCategory(category: NotificationCategory): string {
    switch (category) {
      case 'message':
        return 'messages';
      case 'credit_transfer':
        return 'credits';
      case 'promotion':
      case 'claim':
        return 'promotions';
      case 'friend_request':
      case 'friend_accepted':
        return 'friends';
      case 'broadcast':
        return 'broadcasts';
      default:
        return 'default';
    }
  }

  // Save notifications to history
  private async saveToHistory(notifications: NotificationData[]) {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      const history: NotificationData[] = existing ? JSON.parse(existing) : [];

      // Add new notifications to beginning
      const updated = [...notifications, ...history].slice(0, 100); // Keep last 100

      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(updated));
    } catch (error) {
      console.error('[Notification] Error saving history:', error);
    }
  }

  // Get notification history
  async getHistory(): Promise<NotificationData[]> {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('[Notification] Error getting history:', error);
      return [];
    }
  }

  // Clear notification history
  async clearHistory() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    } catch (error) {
      console.error('[Notification] Error clearing history:', error);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string) {
    try {
      const history = await this.getHistory();
      const updated = history.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(updated));
    } catch (error) {
      console.error('[Notification] Error marking as read:', error);
    }
  }

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const history = await this.getHistory();
    return history.filter((n) => !n.isRead).length;
  }

  // Sound settings
  async setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    await AsyncStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, enabled.toString());
    console.log('[Notification] Sound enabled:', enabled);
  }

  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear all notifications
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
    await this.setBadgeCount(0);
  }
}

export const notificationService = NotificationService.getInstance();
