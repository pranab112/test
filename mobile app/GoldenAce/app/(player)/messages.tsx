import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { chatApi } from '../../src/api/chat.api';
import { useChat } from '../../src/contexts/ChatContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { Card, Avatar, Badge, Loading, EmptyState } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '../../src/constants/theme';
import type { Conversation } from '../../src/types';

export default function PlayerMessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { refreshUnreadCount, subscribeToConversationUpdates } = useChat();
  const { user } = useAuth();

  const loadConversations = async () => {
    try {
      const data = await chatApi.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    await refreshUnreadCount();
    setRefreshing(false);
  };

  // Load conversations when user is available
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Subscribe to real-time conversation updates via WebSocket
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToConversationUpdates((update) => {
      // Update the conversations list with the new data
      setConversations((prevConversations) => {
        const existingIndex = prevConversations.findIndex(
          (conv) => conv.friend.id === update.friend_id
        );

        if (existingIndex >= 0) {
          // Update existing conversation
          const updated = [...prevConversations];
          updated[existingIndex] = {
            ...updated[existingIndex],
            last_message: update.last_message ? {
              id: update.last_message.id,
              content: update.last_message.content,
              message_type: update.last_message.message_type as any,
              created_at: update.last_message.created_at,
              sender_id: update.last_message.sender_id,
            } : updated[existingIndex].last_message,
            unread_count: update.unread_count ?? updated[existingIndex].unread_count,
          };
          // Move to top of list (most recent conversation)
          const [movedItem] = updated.splice(existingIndex, 1);
          updated.unshift(movedItem);
          return updated;
        } else {
          // New conversation - reload the full list to get friend details
          loadConversations();
          return prevConversations;
        }
      });
      refreshUnreadCount();
    });

    return () => unsubscribe();
  }, [user, subscribeToConversationUpdates, refreshUnreadCount]);

  // Refresh conversations and unread count when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Small delay to ensure backend has updated read status
      const timer = setTimeout(() => {
        loadConversations();
        refreshUnreadCount();
      }, 300);
      return () => clearTimeout(timer);
    }, [refreshUnreadCount])
  );

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getMessagePreview = (message?: Conversation['last_message']): string => {
    if (!message) return 'No messages yet';

    switch (message.message_type) {
      case 'image':
        return '📷 Image';
      case 'voice':
        return '🎤 Voice message';
      case 'promotion':
        return '🎁 Promotion';
      case 'credit_transfer':
        return '💰 Credit Transfer';
      default:
        return message.content || '';
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={() => router.push(`/chat/${item.friend.id}`)}
      activeOpacity={0.7}
    >
      <Avatar
        source={item.friend.profile_picture}
        name={item.friend.full_name || item.friend.username}
        size="lg"
        showOnlineStatus
        isOnline={item.friend.is_online}
      />
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {item.friend.full_name || item.friend.username}
          </Text>
          {item.last_message && (
            <Text style={styles.conversationTime}>
              {formatTime(item.last_message.created_at)}
            </Text>
          )}
        </View>
        <View style={styles.conversationPreview}>
          <Text
            style={[
              styles.lastMessage,
              item.unread_count > 0 && styles.lastMessageUnread,
            ]}
            numberOfLines={1}
          >
            {getMessagePreview(item.last_message)}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading fullScreen text="Loading messages..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.friend.id.toString()}
        renderItem={renderConversation}
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
            icon="chatbubbles-outline"
            title="No Conversations"
            description="Start chatting with your friends"
            actionLabel="Find Friends"
            onAction={() => router.push('/(player)/friends')}
          />
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
  list: {
    flexGrow: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  conversationInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  conversationName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    flex: 1,
  },
  conversationTime: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  conversationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  lastMessageUnread: {
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  unreadCount: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
});
