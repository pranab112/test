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
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { friendsApi } from '../../src/api/friends.api';
import { Card, Avatar, Badge, Loading, EmptyState, Button } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Friend, FriendRequest } from '../../src/types';

type TabType = 'players' | 'requests' | 'add' | 'bulk';

export default function ClientFriendsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('players');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchResult, setSearchResult] = useState<Friend | null>(null);
  const [uniqueIdQuery, setUniqueIdQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  // Bulk add state
  const [bulkIds, setBulkIds] = useState('');
  const [bulkSearching, setBulkSearching] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ found: Friend[]; notFound: string[] } | null>(null);
  const [selectedForBulk, setSelectedForBulk] = useState<Set<number>>(new Set());
  const [sendingBulkRequests, setSendingBulkRequests] = useState(false);

  const loadData = async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        friendsApi.getFriends(),
        friendsApi.getPendingRequests(),
      ]);
      // Filter to show only players for clients
      const playerFriends = friendsData.filter(f => f.user_type === 'player');
      setFriends(playerFriends);
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
        // Only show players
        if (result.user_type === 'player') {
          setSearchResult(result);
        } else {
          Alert.alert('Not Found', 'No player found with this ID. Clients can only add players.');
        }
      } else {
        // Try username search as fallback
        const results = await friendsApi.searchUsers(uniqueIdQuery.trim());
        const playerResult = results.find(u => u.user_type === 'player');
        if (playerResult) {
          setSearchResult(playerResult);
        } else {
          Alert.alert('Not Found', 'No player found with this ID or username.');
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
      Alert.alert('Success', 'Friend request sent to the player!');
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
      'Remove Player',
      'Are you sure you want to remove this player from your friends?',
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
              Alert.alert('Error', error?.detail || 'Failed to remove player');
            }
          },
        },
      ]
    );
  };

  // Bulk add functions
  const handleBulkSearch = async () => {
    const ids = bulkIds
      .split(/[\n,;]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (ids.length === 0) {
      Alert.alert('Error', 'Please enter at least one unique ID');
      return;
    }

    if (ids.length > 50) {
      Alert.alert('Error', 'Maximum 50 IDs allowed at once');
      return;
    }

    setBulkSearching(true);
    setBulkResults(null);
    setSelectedForBulk(new Set());

    try {
      const results = await friendsApi.bulkSearchByUniqueIds(ids);
      setBulkResults(results);
      // Auto-select all found players
      setSelectedForBulk(new Set(results.found.map((f) => f.id)));
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to search players');
    } finally {
      setBulkSearching(false);
    }
  };

  const toggleBulkSelection = (playerId: number) => {
    setSelectedForBulk((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const selectAllBulk = () => {
    if (bulkResults) {
      setSelectedForBulk(new Set(bulkResults.found.map((f) => f.id)));
    }
  };

  const deselectAllBulk = () => {
    setSelectedForBulk(new Set());
  };

  const handleSendBulkRequests = async () => {
    if (selectedForBulk.size === 0) {
      Alert.alert('Error', 'Please select at least one player');
      return;
    }

    setSendingBulkRequests(true);
    try {
      const userIds = Array.from(selectedForBulk);
      const results = await friendsApi.sendBulkFriendRequests(userIds);

      const message = `Successfully sent ${results.success.length} request(s)${
        results.failed.length > 0 ? `. ${results.failed.length} failed.` : ''
      }`;

      Alert.alert('Done', message);

      // Clear the form
      setBulkIds('');
      setBulkResults(null);
      setSelectedForBulk(new Set());
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to send requests');
    } finally {
      setSendingBulkRequests(false);
    }
  };

  const renderPlayer = ({ item }: { item: Friend }) => (
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
          <View style={styles.playerMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={12} color={Colors.primary} />
              <Text style={styles.metaText}>Level {item.player_level || 1}</Text>
            </View>
            {item.credits !== undefined && (
              <View style={styles.metaItem}>
                <Ionicons name="wallet" size={12} color={Colors.success} />
                <Text style={styles.metaText}>{item.credits} GC</Text>
              </View>
            )}
          </View>
        </View>
        <Badge text="Player" variant="default" size="sm" />
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
          style={[styles.tab, activeTab === 'players' && styles.tabActive]}
          onPress={() => setActiveTab('players')}
        >
          <Text style={[styles.tabText, activeTab === 'players' && styles.tabTextActive]}>
            My Players ({friends.length})
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
            name="person-add"
            size={18}
            color={activeTab === 'add' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>
            Add
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bulk' && styles.tabActive]}
          onPress={() => setActiveTab('bulk')}
        >
          <Ionicons
            name="people"
            size={18}
            color={activeTab === 'bulk' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'bulk' && styles.tabTextActive]}>
            Bulk Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'players' && (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPlayer}
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
              title="No Players Yet"
              description="Add players using their unique ID to manage them"
              actionLabel="Add Player"
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
              description="Friend requests from players will appear here"
            />
          }
        />
      )}

      {activeTab === 'add' && (
        <View style={styles.addContainer}>
          <View style={styles.addHeader}>
            <Ionicons name="person-add" size={48} color={Colors.primary} />
            <Text style={styles.addTitle}>Add a Player</Text>
            <Text style={styles.addDescription}>
              Enter the player's unique ID to send them a friend request
            </Text>
          </View>

          <View style={styles.searchBox}>
            <Text style={styles.searchLabel}>Player's Unique ID</Text>
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
                <Text style={styles.resultTitle}>Player Found!</Text>
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
                  <View style={styles.playerMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={12} color={Colors.primary} />
                      <Text style={styles.metaText}>Level {searchResult.player_level || 1}</Text>
                    </View>
                  </View>
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
              Ask your player for their unique ID. They can find it in their profile settings.
            </Text>
          </View>
        </View>
      )}

      {activeTab === 'bulk' && (
        <ScrollView style={styles.bulkContainer} contentContainerStyle={styles.bulkContent}>
          <View style={styles.bulkHeader}>
            <Ionicons name="people" size={48} color={Colors.primary} />
            <Text style={styles.addTitle}>Bulk Add Players</Text>
            <Text style={styles.addDescription}>
              Enter multiple unique IDs (one per line, or separated by commas) to add several players at once
            </Text>
          </View>

          <View style={styles.bulkInputBox}>
            <Text style={styles.searchLabel}>Player Unique IDs</Text>
            <TextInput
              style={styles.bulkInput}
              value={bulkIds}
              onChangeText={setBulkIds}
              placeholder="Enter IDs here...&#10;Example:&#10;ABC123&#10;XYZ789&#10;or: ABC123, XYZ789"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.bulkHint}>
              Supports comma (,), semicolon (;), or new line separated IDs. Max 50 at once.
            </Text>
          </View>

          <Button
            title={bulkSearching ? 'Searching...' : 'Search Players'}
            onPress={handleBulkSearch}
            loading={bulkSearching}
            icon={<Ionicons name="search" size={18} color={Colors.background} />}
            style={styles.bulkSearchButton}
          />

          {/* Bulk Results */}
          {bulkResults && (
            <View style={styles.bulkResultsContainer}>
              {/* Found Players */}
              {bulkResults.found.length > 0 && (
                <Card style={styles.bulkResultCard}>
                  <View style={styles.bulkResultHeader}>
                    <View style={styles.bulkResultTitleRow}>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                      <Text style={styles.bulkResultTitle}>
                        Found {bulkResults.found.length} Player(s)
                      </Text>
                    </View>
                    <View style={styles.bulkSelectActions}>
                      <TouchableOpacity onPress={selectAllBulk} style={styles.selectAction}>
                        <Text style={styles.selectActionText}>Select All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={deselectAllBulk} style={styles.selectAction}>
                        <Text style={styles.selectActionText}>Deselect</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {bulkResults.found.map((player) => (
                    <TouchableOpacity
                      key={player.id}
                      style={styles.bulkPlayerItem}
                      onPress={() => toggleBulkSelection(player.id)}
                    >
                      <TouchableOpacity
                        style={[
                          styles.bulkCheckbox,
                          selectedForBulk.has(player.id) && styles.bulkCheckboxSelected,
                        ]}
                        onPress={() => toggleBulkSelection(player.id)}
                      >
                        {selectedForBulk.has(player.id) && (
                          <Ionicons name="checkmark" size={16} color={Colors.background} />
                        )}
                      </TouchableOpacity>
                      <Avatar
                        source={player.profile_picture}
                        name={player.full_name || player.username}
                        size="sm"
                      />
                      <View style={styles.bulkPlayerInfo}>
                        <Text style={styles.bulkPlayerName}>
                          {player.full_name || player.username}
                        </Text>
                        <Text style={styles.bulkPlayerUsername}>
                          @{player.username} {player.user_id && `• ID: ${player.user_id}`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </Card>
              )}

              {/* Not Found IDs */}
              {bulkResults.notFound.length > 0 && (
                <Card style={styles.bulkNotFoundCard}>
                  <View style={styles.bulkResultTitleRow}>
                    <Ionicons name="alert-circle" size={20} color={Colors.warning} />
                    <Text style={styles.bulkNotFoundTitle}>
                      {bulkResults.notFound.length} ID(s) Not Found
                    </Text>
                  </View>
                  <Text style={styles.bulkNotFoundIds}>
                    {bulkResults.notFound.join(', ')}
                  </Text>
                </Card>
              )}

              {/* Send Requests Button */}
              {bulkResults.found.length > 0 && (
                <Button
                  title={
                    sendingBulkRequests
                      ? 'Sending...'
                      : `Send ${selectedForBulk.size} Request(s)`
                  }
                  onPress={handleSendBulkRequests}
                  loading={sendingBulkRequests}
                  disabled={selectedForBulk.size === 0}
                  icon={<Ionicons name="paper-plane" size={18} color={Colors.background} />}
                  style={styles.bulkSendButton}
                />
              )}
            </View>
          )}
        </ScrollView>
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
  playerMeta: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSize.xs,
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
  // Add Player Tab Styles
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
  // Bulk Add Styles
  bulkContainer: {
    flex: 1,
  },
  bulkContent: {
    padding: Spacing.lg,
  },
  bulkHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  bulkInputBox: {
    marginBottom: Spacing.lg,
  },
  bulkInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 150,
  },
  bulkHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  bulkSearchButton: {
    marginBottom: Spacing.lg,
  },
  bulkResultsContainer: {
    marginTop: Spacing.md,
  },
  bulkResultCard: {
    marginBottom: Spacing.md,
  },
  bulkResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  bulkResultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bulkResultTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },
  bulkSelectActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  selectAction: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  selectActionText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  bulkPlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  bulkCheckbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkCheckboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bulkPlayerInfo: {
    flex: 1,
    marginLeft: Spacing.xs,
  },
  bulkPlayerName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  bulkPlayerUsername: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  bulkNotFoundCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.warning + '10',
  },
  bulkNotFoundTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
  },
  bulkNotFoundIds: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  bulkSendButton: {
    marginTop: Spacing.md,
  },
});
