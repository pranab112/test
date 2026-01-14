import React, { useState, useEffect, useCallback } from 'react';
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
import { broadcastsApi, Broadcast } from '../../src/api/broadcasts.api';
import { Card, Loading, Badge } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';

export default function BroadcastsScreen() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBroadcasts = async () => {
    try {
      const data = await broadcastsApi.getBroadcasts();
      setBroadcasts(data);
    } catch (error) {
      console.error('Error loading broadcasts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBroadcasts();
  }, []);

  const handleMarkAsRead = async (broadcast: Broadcast) => {
    if (broadcast.is_read) return;

    try {
      await broadcastsApi.markAsRead(broadcast.id);
      setBroadcasts((prev) =>
        prev.map((b) => (b.id === broadcast.id ? { ...b, is_read: true } : b))
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadCount = broadcasts.filter((b) => !b.is_read).length;
    if (unreadCount === 0) {
      Alert.alert('Info', 'All broadcasts are already read');
      return;
    }

    try {
      await broadcastsApi.markAllAsRead();
      setBroadcasts((prev) => prev.map((b) => ({ ...b, is_read: true })));
      Alert.alert('Success', 'All broadcasts marked as read');
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to mark all as read');
    }
  };

  const getBroadcastIcon = (type: Broadcast['broadcast_type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'announcement':
        return 'megaphone';
      case 'promotion':
        return 'gift';
      case 'maintenance':
        return 'construct';
      case 'update':
        return 'rocket';
      default:
        return 'notifications';
    }
  };

  const getBroadcastColor = (type: Broadcast['broadcast_type']): string => {
    switch (type) {
      case 'announcement':
        return Colors.info;
      case 'promotion':
        return Colors.primary;
      case 'maintenance':
        return Colors.warning;
      case 'update':
        return Colors.success;
      default:
        return Colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: Broadcast['priority']): string => {
    switch (priority) {
      case 'high':
        return Colors.error;
      case 'medium':
        return Colors.warning;
      case 'low':
        return Colors.info;
      default:
        return Colors.textMuted;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderBroadcast = ({ item }: { item: Broadcast }) => {
    const iconColor = getBroadcastColor(item.broadcast_type);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleMarkAsRead(item)}
      >
        <Card style={[styles.broadcastCard, !item.is_read ? styles.unreadCard : undefined]}>
          <View style={styles.broadcastHeader}>
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
              <Ionicons
                name={getBroadcastIcon(item.broadcast_type)}
                size={24}
                color={iconColor}
              />
            </View>
            <View style={styles.headerContent}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, !item.is_read && styles.unreadTitle]}>
                  {item.title}
                </Text>
                {!item.is_read && <View style={styles.unreadDot} />}
              </View>
              <View style={styles.metaRow}>
                <Badge
                  text={item.broadcast_type}
                  variant="default"
                  size="sm"
                />
                {item.priority === 'high' && (
                  <Badge
                    text="High Priority"
                    variant="error"
                    size="sm"
                  />
                )}
                <Text style={styles.date}>{formatDate(item.created_at)}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.content}>{item.content}</Text>
          {item.expires_at && (
            <View style={styles.expiryRow}>
              <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.expiryText}>
                Expires: {new Date(item.expires_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const unreadCount = broadcasts.filter((b) => !b.is_read).length;

  if (loading) {
    return <Loading fullScreen text="Loading announcements..." />;
  }

  return (
    <View style={styles.container}>
      {broadcasts.length > 0 && (
        <View style={styles.header}>
          <Text style={styles.headerText}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
              <Ionicons name="checkmark-done" size={18} color={Colors.primary} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={broadcasts}
        renderItem={renderBroadcast}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Announcements</Text>
            <Text style={styles.emptyText}>
              You're all caught up! Check back later for new updates.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  markAllText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  broadcastCard: {
    marginBottom: Spacing.md,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  broadcastHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    flexWrap: 'wrap',
  },
  date: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  content: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  expiryText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
