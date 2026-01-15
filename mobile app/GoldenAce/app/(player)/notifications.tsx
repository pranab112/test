import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useNotifications } from '../../src/contexts/NotificationContext';
import { NotificationData, NotificationCategory } from '../../src/services/notificationService';
import { Loading, EmptyState, Badge } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refreshNotifications,
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    // Mark as read
    await markAsRead(notification.id);

    // Navigate based on category
    navigateToNotification(notification);
  };

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
        router.push('/(player)/friends');
        break;
      case 'promotion':
        router.push('/(player)/promotions');
        break;
      case 'claim':
        router.push('/(player)/rewards');
        break;
      case 'broadcast':
        router.push('/(player)/broadcasts');
        break;
      default:
        break;
    }
  };

  const handleMarkAllRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark All', onPress: markAllAsRead },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearNotifications },
      ]
    );
  };

  const getIconForCategory = (category: NotificationCategory): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'message':
        return 'chatbubble';
      case 'credit_transfer':
        return 'wallet';
      case 'friend_request':
        return 'person-add';
      case 'promotion':
        return 'megaphone';
      case 'claim':
        return 'gift';
      case 'broadcast':
        return 'notifications';
      default:
        return 'notifications-outline';
    }
  };

  const getColorForCategory = (category: NotificationCategory): string => {
    switch (category) {
      case 'message':
        return Colors.info;
      case 'credit_transfer':
        return Colors.success;
      case 'friend_request':
        return Colors.primary;
      case 'promotion':
        return Colors.warning;
      case 'claim':
        return Colors.primary;
      case 'broadcast':
        return Colors.textSecondary;
      default:
        return Colors.textMuted;
    }
  };

  const formatTime = (date: Date | string): string => {
    const notificationDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationDate.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: NotificationData }) => {
    const iconName = getIconForCategory(item.category);
    const iconColor = getColorForCategory(item.category);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !item.isRead && styles.unreadTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <Loading fullScreen text="Loading notifications..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      {notifications.length > 0 && (
        <View style={styles.headerActions}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <Badge text={unreadCount.toString()} variant="primary" size="sm" />
            )}
          </View>
          <View style={styles.headerRight}>
            {unreadCount > 0 && (
              <TouchableOpacity style={styles.headerButton} onPress={handleMarkAllRead}>
                <Ionicons name="checkmark-done" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerButton} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Notification List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No Notifications"
            description="You're all caught up! New notifications will appear here."
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  list: {
    flexGrow: 1,
    paddingVertical: Spacing.sm,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },
  unreadItem: {
    backgroundColor: Colors.primary + '08',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  contentContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: FontWeight.bold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  body: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 76, // Icon width + padding
  },
});
