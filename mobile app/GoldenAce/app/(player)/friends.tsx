import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { friendsApi } from '../../src/api/friends.api';
import { Card, Avatar, Badge, Loading, EmptyState, Input, Button } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Friend, FriendRequest } from '../../src/types';

type TabType = 'friends' | 'requests' | 'search';

export default function PlayerFriendsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);

  const loadData = async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        friendsApi.getFriends(),
        friendsApi.getPendingRequests(),
      ]);
      setFriends(friendsData);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await friendsApi.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: number) => {
    try {
      await friendsApi.sendFriendRequest(userId);
      Alert.alert('Success', 'Friend request sent!');
      // Remove from search results
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to send request');
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await friendsApi.acceptRequest(requestId);
      await loadData();
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await friendsApi.rejectRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to reject request');
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await friendsApi.removeFriend(friendId);
              setFriends((prev) => prev.filter((f) => f.id !== friendId));
            } catch (error: any) {
              Alert.alert('Error', error?.detail || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <Card style={styles.friendCard}>
      <TouchableOpacity
        style={styles.friendContent}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <Avatar
          source={item.profile_picture}
          name={item.full_name || item.username}
          size="md"
          showOnlineStatus
          isOnline={item.is_online}
        />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.full_name || item.username}</Text>
          <Text style={styles.friendUsername}>@{item.username}</Text>
        </View>
        <Badge
          text={item.user_type}
          variant={item.user_type === 'client' ? 'emerald' : 'default'}
          size="sm"
        />
      </TouchableOpacity>
      <View style={styles.friendActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/chat/${item.id}`)}
        >
          <Ionicons name="chatbubble" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleRemoveFriend(item.id)}
        >
          <Ionicons name="person-remove" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <Card style={styles.requestCard}>
      <View style={styles.requestContent}>
        <Avatar
          source={item.requester?.profile_picture}
          name={item.requester?.full_name || item.requester?.username}
          size="md"
        />
        <View style={styles.requestInfo}>
          <Text style={styles.friendName}>
            {item.requester?.full_name || item.requester?.username}
          </Text>
          <Text style={styles.friendUsername}>@{item.requester?.username}</Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <Button
          title="Accept"
          onPress={() => handleAcceptRequest(item.id)}
          size="sm"
          style={styles.acceptButton}
        />
        <Button
          title="Decline"
          onPress={() => handleRejectRequest(item.id)}
          variant="outline"
          size="sm"
        />
      </View>
    </Card>
  );

  const renderSearchResult = ({ item }: { item: Friend }) => (
    <Card style={styles.searchCard}>
      <View style={styles.searchContent}>
        <Avatar
          source={item.profile_picture}
          name={item.full_name || item.username}
          size="md"
        />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.full_name || item.username}</Text>
          <Text style={styles.friendUsername}>@{item.username}</Text>
        </View>
        <Badge text={item.user_type} variant="default" size="sm" />
      </View>
      <Button
        title="Add Friend"
        onPress={() => handleSendRequest(item.id)}
        size="sm"
        icon={<Ionicons name="person-add" size={16} color={Colors.background} />}
      />
    </Card>
  );

  if (loading) {
    return <Loading fullScreen text="Loading friends..." />;
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text
            style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}
          >
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text
            style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}
          >
            Requests ({requests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.tabActive]}
          onPress={() => setActiveTab('search')}
        >
          <Text
            style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}
          >
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'friends' && (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFriend}
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
              icon="people-outline"
              title="No Friends Yet"
              description="Search for users to add them as friends"
              actionLabel="Find Friends"
              onAction={() => setActiveTab('search')}
            />
          }
        />
      )}

      {activeTab === 'requests' && (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRequest}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="mail-outline"
              title="No Pending Requests"
              description="Friend requests will appear here"
            />
          }
        />
      )}

      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Input
              placeholder="Search by username..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              leftIcon="search"
              containerStyle={styles.searchInputContainer}
            />
            <Button
              title="Search"
              onPress={handleSearch}
              loading={searching}
              size="md"
            />
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderSearchResult}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              searchQuery ? (
                <EmptyState
                  icon="search-outline"
                  title="No Users Found"
                  description="Try a different search term"
                />
              ) : (
                <EmptyState
                  icon="search-outline"
                  title="Search for Users"
                  description="Enter a username to find people"
                />
              )
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  list: {
    padding: Spacing.md,
  },
  friendCard: {
    marginBottom: Spacing.sm,
  },
  friendContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  friendName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  friendUsername: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  friendActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
  },
  requestCard: {
    marginBottom: Spacing.sm,
  },
  requestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  requestInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  acceptButton: {
    flex: 1,
  },
  searchContainer: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  searchInputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  searchCard: {
    marginBottom: Spacing.sm,
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
});
