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
  Switch,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { friendsApi } from '../../src/api/friends.api';
import { clientApi, PlayerRegistrationResponse } from '../../src/api/client.api';
import { Card, Avatar, Badge, Loading, EmptyState, Button } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Friend, FriendRequest } from '../../src/types';

type TabType = 'send-request' | 'requests' | 'register' | 'bulk-register';

export default function ClientFriendsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('send-request');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchResult, setSearchResult] = useState<Friend | null>(null);
  const [uniqueIdQuery, setUniqueIdQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  // Register player state
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [useAutoPassword, setUseAutoPassword] = useState(true);
  const [registeringPlayer, setRegisteringPlayer] = useState(false);
  const [registeredPlayer, setRegisteredPlayer] = useState<PlayerRegistrationResponse | null>(null);

  // Bulk register state
  const [bulkRegisterData, setBulkRegisterData] = useState('');
  const [bulkRegistering, setBulkRegistering] = useState(false);
  const [bulkRegisterPreview, setBulkRegisterPreview] = useState<{ username: string; full_name: string }[]>([]);

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
      let result: Friend | null = null;

      try {
        result = await friendsApi.searchByUniqueId(uniqueIdQuery.trim());
      } catch (uniqueIdError) {
        // Unique ID search failed, will try username search
        console.log('Unique ID search failed, trying username search...');
      }

      if (result) {
        // Only show players
        if (result.user_type === 'player') {
          setSearchResult(result);
        } else {
          Alert.alert('Not Found', 'No player found with this ID. Clients can only add players.');
        }
      } else {
        // Try username search as fallback
        try {
          const results = await friendsApi.searchUsers(uniqueIdQuery.trim());
          const playerResult = Array.isArray(results)
            ? results.find(u => u.user_type === 'player')
            : null;
          if (playerResult) {
            setSearchResult(playerResult);
          } else {
            Alert.alert('Not Found', 'No player found with this ID or username.');
          }
        } catch (usernameError: any) {
          console.error('Username search failed:', usernameError);
          Alert.alert('Not Found', 'No player found with this ID or username.');
        }
      }
    } catch (error: any) {
      console.error('Error searching:', error);
      const errorMsg = error?.detail || error?.error?.message || error?.message || 'Failed to search. Please try again.';
      Alert.alert('Error', errorMsg);
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

  // Register player function
  const handleRegisterPlayer = async () => {
    if (!registerUsername.trim() || !registerFullName.trim()) {
      Alert.alert('Error', 'Please enter username and full name');
      return;
    }

    if (!useAutoPassword && !registerPassword.trim()) {
      Alert.alert('Error', 'Please enter a password or use auto-generated password');
      return;
    }

    setRegisteringPlayer(true);
    setRegisteredPlayer(null);
    try {
      const result = await clientApi.registerPlayer({
        username: registerUsername.trim(),
        full_name: registerFullName.trim(),
        password: useAutoPassword ? undefined : registerPassword.trim(),
      });

      setRegisteredPlayer(result);

      // Show success with credentials
      const passwordInfo = result.temp_password
        ? `Password: ${result.temp_password}`
        : `Password: ${registerPassword}`;

      Alert.alert(
        'Player Registered!',
        `Username: ${result.username}\n${passwordInfo}\n\nPlayer ID: ${result.user_id}\nCredits: ${result.credits} GC`,
        [{ text: 'OK' }]
      );

      // Clear form
      setRegisterUsername('');
      setRegisterFullName('');
      setRegisterPassword('');
      setUseAutoPassword(true);

      // Refresh player list
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to register player');
    } finally {
      setRegisteringPlayer(false);
    }
  };

  // Parse bulk register data for preview
  const parseBulkData = (data: string) => {
    const lines = data.split('\n').filter(line => line.trim());
    const players: { username: string; full_name: string }[] = [];

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        players.push({
          username: parts[0],
          full_name: parts[1],
        });
      }
    }
    return players;
  };

  const handlePreviewBulkRegister = () => {
    const players = parseBulkData(bulkRegisterData);
    if (players.length === 0) {
      Alert.alert('Error', 'Please enter valid data. Format: username, full_name (one per line)');
      return;
    }
    setBulkRegisterPreview(players);
  };

  const handleBulkRegister = async () => {
    if (bulkRegisterPreview.length === 0) {
      Alert.alert('Error', 'Please preview the data first');
      return;
    }

    setBulkRegistering(true);
    try {
      const result = await clientApi.bulkRegisterPlayers(bulkRegisterPreview);

      let message = `Successfully created ${result.total_created} player(s)`;
      if (result.total_failed > 0) {
        message += `\nFailed: ${result.total_failed}`;
        if (result.failed.length > 0) {
          message += `\n\nFailed usernames:\n${result.failed.map(f => `${f.username}: ${f.reason}`).join('\n')}`;
        }
      }

      Alert.alert('Bulk Registration Complete', message);

      // Clear form
      setBulkRegisterData('');
      setBulkRegisterPreview([]);

      // Refresh player list
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to register players');
    } finally {
      setBulkRegistering(false);
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
          source={item.sender?.profile_picture}
          name={item.sender?.full_name || item.sender?.username || 'Unknown'}
          size="md"
        />
        <View style={styles.requestInfo}>
          <Text style={styles.friendName}>
            {item.sender?.full_name || item.sender?.username || 'Unknown User'}
          </Text>
          <Text style={styles.friendUsername}>@{item.sender?.username || 'unknown'}</Text>
          {item.sender?.user_type && (
            <Text style={styles.friendUniqueId}>{item.sender.user_type}</Text>
          )}
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
          style={[styles.tab, activeTab === 'send-request' && styles.tabActive]}
          onPress={() => setActiveTab('send-request')}
        >
          <Ionicons
            name="person-add"
            size={16}
            color={activeTab === 'send-request' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'send-request' && styles.tabTextActive]}>
            Add
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
          style={[styles.tab, activeTab === 'register' && styles.tabActive]}
          onPress={() => setActiveTab('register')}
        >
          <Ionicons
            name="person-add"
            size={18}
            color={activeTab === 'register' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}>
            Register
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bulk-register' && styles.tabActive]}
          onPress={() => setActiveTab('bulk-register')}
        >
          <Ionicons
            name="people"
            size={18}
            color={activeTab === 'bulk-register' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'bulk-register' && styles.tabTextActive]}>
            Bulk
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'send-request' && (
        <ScrollView style={styles.addContainer} contentContainerStyle={styles.sendRequestContent}>
          <View style={styles.addHeader}>
            <Ionicons name="person-add" size={48} color={Colors.primary} />
            <Text style={styles.addTitle}>Send Friend Request</Text>
            <Text style={styles.addDescription}>
              Search for a player by their unique ID or username to send a friend request
            </Text>
          </View>

          <View style={styles.searchBox}>
            <Text style={styles.searchLabel}>Player Unique ID or Username</Text>
            <View style={styles.searchInputRow}>
              <TextInput
                style={styles.searchInput}
                value={uniqueIdQuery}
                onChangeText={setUniqueIdQuery}
                placeholder="Enter player ID or username..."
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
                {searching ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Ionicons name="search" size={24} color={Colors.background} />
                )}
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
                </View>
                <Badge text="Player" variant="default" size="sm" />
              </View>
              <View style={styles.resultActions}>
                <Button
                  title={sendingRequest ? 'Sending...' : 'Send Friend Request'}
                  onPress={() => handleSendRequest(searchResult.id)}
                  loading={sendingRequest}
                  icon={<Ionicons name="paper-plane" size={18} color={Colors.background} />}
                  style={styles.resultButton}
                />
              </View>
            </Card>
          )}

          <View style={styles.helpBox}>
            <Ionicons name="information-circle" size={20} color={Colors.info} />
            <Text style={styles.helpText}>
              Each player has a unique ID that they can share with you. You can also search by their username.
              Once they accept your request, you'll be able to chat and manage their game credentials.
            </Text>
          </View>
        </ScrollView>
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

      {activeTab === 'register' && (
        <ScrollView style={styles.addContainer} contentContainerStyle={styles.registerContent}>
          <View style={styles.addHeader}>
            <Ionicons name="person-add" size={48} color={Colors.primary} />
            <Text style={styles.addTitle}>Register New Player</Text>
            <Text style={styles.addDescription}>
              Create a new player account with username and password
            </Text>
          </View>

          <View style={styles.formBox}>
            <View style={styles.inputGroup}>
              <Text style={styles.searchLabel}>Username *</Text>
              <TextInput
                style={styles.searchInput}
                value={registerUsername}
                onChangeText={setRegisterUsername}
                placeholder="Enter username..."
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.searchLabel}>Full Name *</Text>
              <TextInput
                style={styles.searchInput}
                value={registerFullName}
                onChangeText={setRegisterFullName}
                placeholder="Enter full name..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.passwordHeader}>
                <Text style={styles.searchLabel}>Password</Text>
                <View style={styles.autoPasswordToggle}>
                  <Text style={styles.autoPasswordText}>Auto-generate</Text>
                  <Switch
                    value={useAutoPassword}
                    onValueChange={setUseAutoPassword}
                    trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                    thumbColor={useAutoPassword ? Colors.primary : Colors.textMuted}
                  />
                </View>
              </View>
              {!useAutoPassword && (
                <TextInput
                  style={styles.searchInput}
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                  placeholder="Enter password..."
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                />
              )}
              {useAutoPassword && (
                <View style={styles.autoPasswordInfo}>
                  <Ionicons name="information-circle" size={16} color={Colors.info} />
                  <Text style={styles.autoPasswordInfoText}>
                    Password will be: username@135
                  </Text>
                </View>
              )}
            </View>

            <Button
              title={registeringPlayer ? 'Registering...' : 'Register Player'}
              onPress={handleRegisterPlayer}
              loading={registeringPlayer}
              icon={<Ionicons name="person-add" size={18} color={Colors.background} />}
              style={styles.registerButton}
            />
          </View>

          {/* Success Result */}
          {registeredPlayer && (
            <Card style={styles.successCard}>
              <View style={styles.successHeader}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                <Text style={styles.successTitle}>Player Registered!</Text>
              </View>
              <View style={styles.credentialRow}>
                <Text style={styles.credentialLabel}>Username:</Text>
                <Text style={styles.credentialValue}>{registeredPlayer.username}</Text>
              </View>
              {registeredPlayer.temp_password && (
                <View style={styles.credentialRow}>
                  <Text style={styles.credentialLabel}>Password:</Text>
                  <Text style={styles.credentialValue}>{registeredPlayer.temp_password}</Text>
                </View>
              )}
              <View style={styles.credentialRow}>
                <Text style={styles.credentialLabel}>Player ID:</Text>
                <Text style={styles.credentialValue}>{registeredPlayer.user_id}</Text>
              </View>
              <View style={styles.credentialRow}>
                <Text style={styles.credentialLabel}>Credits:</Text>
                <Text style={styles.credentialValue}>{registeredPlayer.credits} GC</Text>
              </View>
            </Card>
          )}

          <View style={styles.helpBox}>
            <Ionicons name="information-circle" size={20} color={Colors.info} />
            <Text style={styles.helpText}>
              Share the username and password with your player. They can use these credentials to login to the app.
            </Text>
          </View>
        </ScrollView>
      )}

      {activeTab === 'bulk-register' && (
        <ScrollView style={styles.bulkContainer} contentContainerStyle={styles.bulkContent}>
          <View style={styles.bulkHeader}>
            <Ionicons name="people" size={48} color={Colors.primary} />
            <Text style={styles.addTitle}>Bulk Register Players</Text>
            <Text style={styles.addDescription}>
              Register multiple players at once using CSV format: username, full_name (one per line)
            </Text>
          </View>

          <View style={styles.bulkInputBox}>
            <Text style={styles.searchLabel}>Player Data (CSV Format)</Text>
            <TextInput
              style={styles.bulkInput}
              value={bulkRegisterData}
              onChangeText={(text) => {
                setBulkRegisterData(text);
                setBulkRegisterPreview([]);
              }}
              placeholder="username1, Full Name 1&#10;username2, Full Name 2&#10;username3, Full Name 3"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.bulkHint}>
              Format: username, full_name (one player per line). Password will be auto-generated as username@135
            </Text>
          </View>

          <Button
            title="Preview Players"
            onPress={handlePreviewBulkRegister}
            variant="outline"
            icon={<Ionicons name="eye" size={18} color={Colors.primary} />}
            style={styles.bulkSearchButton}
          />

          {/* Preview Results */}
          {bulkRegisterPreview.length > 0 && (
            <View style={styles.bulkResultsContainer}>
              <Card style={styles.bulkResultCard}>
                <View style={styles.bulkResultHeader}>
                  <View style={styles.bulkResultTitleRow}>
                    <Ionicons name="list" size={20} color={Colors.primary} />
                    <Text style={styles.bulkResultTitle}>
                      {bulkRegisterPreview.length} Player(s) to Register
                    </Text>
                  </View>
                </View>

                {bulkRegisterPreview.slice(0, 10).map((player, index) => (
                  <View key={index} style={styles.bulkPlayerItem}>
                    <View style={styles.previewNumber}>
                      <Text style={styles.previewNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.bulkPlayerInfo}>
                      <Text style={styles.bulkPlayerName}>{player.full_name}</Text>
                      <Text style={styles.bulkPlayerUsername}>@{player.username}</Text>
                    </View>
                  </View>
                ))}

                {bulkRegisterPreview.length > 10 && (
                  <Text style={styles.morePlayersText}>
                    ...and {bulkRegisterPreview.length - 10} more player(s)
                  </Text>
                )}
              </Card>

              <Button
                title={bulkRegistering ? 'Registering...' : `Register ${bulkRegisterPreview.length} Player(s)`}
                onPress={handleBulkRegister}
                loading={bulkRegistering}
                icon={<Ionicons name="person-add" size={18} color={Colors.background} />}
                style={styles.bulkSendButton}
              />
            </View>
          )}

          <View style={styles.helpBox}>
            <Ionicons name="information-circle" size={20} color={Colors.info} />
            <Text style={styles.helpText}>
              All registered players will automatically receive 1000 GC and will be connected to you as friends.
            </Text>
          </View>
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
  // Send Request tab styles
  sendRequestContent: {
    paddingBottom: Spacing.xl,
  },
  // Register player styles
  registerContent: {
    paddingBottom: Spacing.xl,
  },
  formBox: {
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  autoPasswordToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  autoPasswordText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  autoPasswordInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.info + '10',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  autoPasswordInfoText: {
    fontSize: FontSize.sm,
    color: Colors.info,
  },
  registerButton: {
    marginTop: Spacing.lg,
  },
  successCard: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.success + '10',
    borderColor: Colors.success,
    borderWidth: 1,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.success + '30',
  },
  credentialLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  credentialValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  previewNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewNumberText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  morePlayersText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});
