import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

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
  PUSH_TOKEN: '@notification_push_token',
  SOUND_ENABLED: '@notification_sound_enabled',
  LAST_SOUND_TIME: '@notification_last_sound_time',
  NOTIFICATION_HISTORY: '@notification_history',
};

// Batch notification settings
const BATCH_NOTIFICATION_DELAY = 3000; // 3 seconds to batch notifications
const MIN_SOUND_INTERVAL = 2000; // Minimum 2 seconds between sounds

class NotificationService {
  private static instance: NotificationService;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private batchQueue: NotificationData[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private lastSoundTime: number = 0;
  private soundEnabled: boolean = true;
  private onNotificationReceived: ((notification: NotificationData) => void) | null = null;
  private onNotificationResponse: ((notification: NotificationData) => void) | null = null;

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
      console.error('Error loading sound settings:', error);
    }
  }

  // Configure notification handler behavior
  async configure() {
    // Set notification handler for foreground notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: this.soundEnabled,
        shouldSetBadge: true,
      }),
    });

    // Configure notification channels for Android
    if (Platform.OS === 'android') {
      await this.createNotificationChannels();
    }
  }

  // Create Android notification channels
  private async createNotificationChannels() {
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

    // Friends channel (for friend requests and accepts)
    await Notifications.setNotificationChannelAsync('friends', {
      name: 'Friend Requests',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D09C',
      sound: 'default',
    });

    // Silent channel for broadcasts
    await Notifications.setNotificationChannelAsync('broadcasts', {
      name: 'Broadcasts',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
    });
  }

  // Request permission and get push token
  async registerForPushNotifications(): Promise<string | null> {
    // Push notifications don't work in Expo Go for SDK 53+
    if (isExpoGo) {
      console.log('Push notifications are not supported in Expo Go (SDK 53+). Use a development build.');
      return null;
    }

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get Expo push token
    try {
      // Get project ID from app config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.log('No EAS project ID found in app.json. Push notifications disabled.');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      // Save token locally
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token.data);

      // Register token with backend
      await this.registerTokenWithBackend(token.data);

      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Register push token with backend
  private async registerTokenWithBackend(token: string) {
    try {
      await api.post('/notifications/register-token', {
        token,
        platform: Platform.OS,
        device_type: Device.modelName || 'Unknown',
      });
    } catch (error) {
      console.error('Error registering token with backend:', error);
    }
  }

  // Set up notification listeners
  setupListeners(
    onReceived: (notification: NotificationData) => void,
    onResponse: (notification: NotificationData) => void
  ) {
    this.onNotificationReceived = onReceived;
    this.onNotificationResponse = onResponse;

    // Listener for received notifications (foreground)
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        const notificationData = this.parseNotification(notification);
        this.handleNotificationReceived(notificationData);
      }
    );

    // Listener for notification responses (taps)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const notificationData = this.parseNotification(response.notification);
        if (this.onNotificationResponse) {
          this.onNotificationResponse(notificationData);
        }
      }
    );
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

  // Handle received notification with batching
  private handleNotificationReceived(notification: NotificationData) {
    // Add to batch queue
    this.batchQueue.push(notification);

    // Clear existing timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Set timer to process batch
    this.batchTimer = setTimeout(() => {
      this.processBatchNotifications();
    }, BATCH_NOTIFICATION_DELAY);
  }

  // Process batched notifications
  private processBatchNotifications() {
    const notifications = [...this.batchQueue];
    this.batchQueue = [];

    if (notifications.length === 0) return;

    // Play sound only once for batch (with rate limiting)
    if (this.soundEnabled) {
      this.playBatchSound();
    }

    // Notify callback for each notification
    notifications.forEach((notification) => {
      if (this.onNotificationReceived) {
        this.onNotificationReceived(notification);
      }
    });

    // Store in history
    this.saveToHistory(notifications);
  }

  // Play sound with rate limiting
  private async playBatchSound() {
    const now = Date.now();
    if (now - this.lastSoundTime < MIN_SOUND_INTERVAL) {
      return; // Skip sound if too soon
    }

    this.lastSoundTime = now;

    // The notification system handles the sound through channels
    // This is a fallback for additional sound if needed
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
      console.error('Error saving notification history:', error);
    }
  }

  // Get notification history
  async getHistory(): Promise<NotificationData[]> {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  // Clear notification history
  async clearHistory() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    } catch (error) {
      console.error('Error clearing notification history:', error);
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
      console.error('Error marking notification as read:', error);
    }
  }

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const history = await this.getHistory();
    return history.filter((n) => !n.isRead).length;
  }

  // Schedule local notification
  async scheduleLocalNotification(
    title: string,
    body: string,
    category: NotificationCategory,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
  ) {
    const channelId = this.getChannelForCategory(category);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...data, category },
        sound: this.soundEnabled ? 'default' : undefined,
      },
      trigger: trigger || null, // null = immediate
    });
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

  // Sound settings
  async setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    await AsyncStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, enabled.toString());
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
