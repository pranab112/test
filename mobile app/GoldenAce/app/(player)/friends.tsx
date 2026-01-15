import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { friendsApi } from '../../src/api/friends.api';
import { Card, Avatar, Badge, Loading, EmptyState, Button } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Friend, FriendRequest } from '../../src/types';

type TabType = 'clients' | 'requests' | 'add';

export default function PlayerFriendsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('clients');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchResult, setSearchResult] = useState<Friend | null>(null);
  const [uniqueIdQuery, setUniqueIdQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  const loadData = async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        friendsApi.getFriends(),
        friendsApi.getPendingRequests(),
      ]);
      // Filter to show only clients for players
      const clientFriends = friendsData.filter(f => f.user_type === 'client');
      setFriends(clientFriends);
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

  const handleSearchByUniqueId = async () => {
    if (!uniqueIdQuery.trim()) {
      Alert.alert('Error', 'Please enter a unique ID');
      return;
    }

    setSearching(true);
    setSearchResult(null);
    try {
      // First try searching by unique ID, then fall back to username search
      const result = await friendsApi.searchByUniqueId(uniqueIdQuery.trim());
      if (result) {
        // Only show clients
        if (result.user_type === 'client') {
          setSearchResult(result);
        } else {
          Alert.alert('Not Found', 'No client found with this ID. Players can only add clients.');
        }
      } else {
        // Try username search as fallback
        const results = await friendsApi.searchUsers(uniqueIdQuery.trim());
        const clientResult = results.find(u => u.user_type === 'client');
        if (clientResult) {
          setSearchResult(clientResult);
        } else {
          Alert.alert('Not Found', 'No client found with this ID or username.');
        }
      }
    } catch (error: any) {
      console.error('Error searching:', error);
      Alert.alert('Error', error?.detail || 'Failed to search. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: number) => {
    setSendingRequest(true);
    try {
      await friendsApi.sendFriendRequest(userId);
      Alert.alert('Success', 'Friend request sent to the client!');
      setSearchResult(null);
      setUniqueIdQuery('');
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to send request');
    } finally {
      setSendingRequest(false);
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
      'Remove Client',
      'Are you sure you want to remove this client from your friends?',
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
              Alert.alert('Error', error?.detail || 'Failed to remove client');
            }
          },
        },
      ]
    );
  };

  const renderClient = ({ item }: { item: Friend }) => (
    <Card style={styles.friendCard}>
      <TouchableOpacity
        style={styles.friendContent}
        onPress={() => router.push(`/profile/${item.id}`)}
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
          {item.user_id && (
            <Text style={styles.friendUniqueId}>ID: {item.user_id}</Text>
          )}
        </View>
        <Badge text="Client" variant="emerald" size="sm" />
      </TouchableOpacity>
      <View style={styles.friendActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/profile/${item.id}`)}
        >
          <Ionicons name="person" size={20} color={Colors.primary} />
        </TouchableOpacity>
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

  if (loading) {
    return <Loading fullScreen text="Loading..." />;
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'clients' && styles.tabActive]}
          onPress={() => setActiveTab('clients')}
        >
          <Text style={[styles.tabText, activeTab === 'clients' && styles.tabTextActive]}>
            My Clients ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Requests ({requests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.tabActive]}
          onPress={() => setActiveTab('add')}
        >
          <Ionicons
            name="add-circle"
            size={20}
            color={activeTab === 'add' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>
            Add Client
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'clients' && (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderClient}
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
              icon="business-outline"
              title="No Clients Yet"
              description="Add a client using their unique ID to start playing"
              actionLabel="Add Client"
              onAction={() => setActiveTab('add')}
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

      {activeTab === 'add' && (
        <View style={styles.addContainer}>
          <View style={styles.addHeader}>
            <Ionicons name="business" size={48} color={Colors.primary} />
            <Text style={styles.addTitle}>Add a Client</Text>
            <Text style={styles.addDescription}>
              Enter the client's unique ID to send them a friend request
            </Text>
          </View>

          <View style={styles.searchBox}>
            <Text style={styles.searchLabel}>Client's Unique ID</Text>
            <View style={styles.searchInputRow}>
              <TextInput
                style={styles.searchInput}
                value={uniqueIdQuery}
                onChangeText={setUniqueIdQuery}
                placeholder="Enter unique ID or username..."
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleSearchByUniqueId}
              />
              <TouchableOpacity
                style={[styles.searchButton, searching && styles.searchButtonDisabled]}
                onPress={handleSearchByUniqueId}
                disabled={searching}
              >
                <Ionicons
                  name={searching ? 'hourglass' : 'search'}
                  size={24}
                  color={Colors.background}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Result */}
          {searchResult && (
            <Card style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>Client Found!</Text>
              </View>
              <View style={styles.resultContent}>
                <Avatar
                  source={searchResult.profile_picture}
                  name={searchResult.full_name || searchResult.username}
                  size="lg"
                />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>
                    {searchResult.full_name || searchResult.username}
                  </Text>
                  <Text style={styles.resultUsername}>@{searchResult.username}</Text>
                  {searchResult.user_id && (
                    <Text style={styles.resultUniqueId}>ID: {searchResult.user_id}</Text>
                  )}
                </View>
              </View>
              <View style={styles.resultActions}>
                <Button
                  title="View Profile"
                  onPress={() => router.push(`/profile/${searchResult.id}`)}
                  variant="outline"
                  size="md"
                  style={styles.resultButton}
                />
                <Button
                  title={sendingRequest ? 'Sending...' : 'Send Request'}
                  onPress={() => handleSendRequest(searchResult.id)}
                  size="md"
                  loading={sendingRequest}
                  icon={<Ionicons name="person-add" size={18} color={Colors.background} />}
                  style={styles.resultButton}
                />
              </View>
            </Card>
          )}

          <View style={styles.helpBox}>
            <Ionicons name="information-circle" size={20} color={Colors.info} />
            <Text style={styles.helpText}>
              Ask your client for their unique ID. They can find it in their profile settings.
            </Text>
          </View>
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
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
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
    flexGrow: 1,
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
  friendUniqueId: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
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
  // Add Client Tab Styles
  addContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  addHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  addTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  addDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  searchBox: {
    marginBottom: Spacing.lg,
  },
  searchLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  searchInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchButton: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  resultCard: {
    marginBottom: Spacing.lg,
  },
  resultHeader: {
    marginBottom: Spacing.md,
  },
  resultTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  resultInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  resultName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  resultUsername: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  resultUniqueId: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  resultActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  resultButton: {
    flex: 1,
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.info + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  helpText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.info,
    lineHeight: 20,
  },
});
