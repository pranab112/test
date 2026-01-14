import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { friendsApi } from '../../src/api/friends.api';
import { Card, Avatar, Badge, Loading, EmptyState, Input } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Friend } from '../../src/types';

export default function ClientPlayersScreen() {
  const [players, setPlayers] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPlayers = async () => {
    try {
      const friendsData = await friendsApi.getFriends();
      const playerFriends = friendsData.filter((f) => f.user_type === 'player');
      setPlayers(playerFriends);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlayers();
    setRefreshing(false);
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const filteredPlayers = players.filter(
    (player) =>
      player.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (player.full_name && player.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const onlinePlayers = filteredPlayers.filter((p) => p.is_online);
  const offlinePlayers = filteredPlayers.filter((p) => !p.is_online);

  const renderPlayer = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={styles.playerCard}
      onPress={() => router.push(`/profile/${item.id}`)}
      activeOpacity={0.7}
    >
      <Avatar
        source={item.profile_picture}
        name={item.full_name || item.username}
        size="lg"
        showOnlineStatus
        isOnline={item.is_online}
      />
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{item.full_name || item.username}</Text>
        <Text style={styles.playerUsername}>@{item.username}</Text>
        <View style={styles.playerMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={14} color={Colors.primary} />
            <Text style={styles.metaText}>Level {item.player_level || 1}</Text>
          </View>
          {item.credits !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="wallet" size={14} color={Colors.success} />
              <Text style={styles.metaText}>{item.credits} GC</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.actions}>
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
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Badge text={count.toString()} variant="default" size="sm" />
    </View>
  );

  if (loading) {
    return <Loading fullScreen text="Loading players..." />;
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search players..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchInput}
        />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{players.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.success }]}>
            {players.filter((p) => p.is_online).length}
          </Text>
          <Text style={styles.statLabel}>Online</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.textMuted }]}>
            {players.filter((p) => !p.is_online).length}
          </Text>
          <Text style={styles.statLabel}>Offline</Text>
        </View>
      </View>

      {/* Players List */}
      <FlatList
        data={filteredPlayers}
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
            title="No Players Found"
            description={
              searchQuery
                ? "No players match your search"
                : "Add players using their unique ID"
            }
            actionLabel="Add Player"
            onAction={() => router.push('/(client)/friends')}
          />
        }
        ListHeaderComponent={
          onlinePlayers.length > 0 ? (
            renderSectionHeader('Online', onlinePlayers.length)
          ) : null
        }
      />

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(client)/friends')}
        activeOpacity={0.8}
      >
        <Ionicons name="person-add" size={24} color={Colors.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    padding: Spacing.md,
    paddingBottom: 0,
  },
  searchInput: {
    marginBottom: 0,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  statNumber: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  list: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  playerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  playerName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  playerUsername: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  playerMeta: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
