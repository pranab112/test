import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { gamesApi } from '../../src/api/games.api';
import { friendsApi } from '../../src/api/friends.api';
import { Card, Loading, EmptyState, Badge, Input } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import { getFileUrl } from '../../src/config/api.config';
import type { Game, Friend } from '../../src/types';

export default function PlayerGamesScreen() {
  const [games, setGames] = useState<Game[]>([]);
  const [clients, setClients] = useState<Friend[]>([]);
  const [selectedClient, setSelectedClient] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadClients = async () => {
    try {
      // Get friends who are clients
      const friendsList = await friendsApi.getFriends();
      const clientFriends = friendsList.filter((f) => f.user_type === 'client');
      setClients(clientFriends);

      if (clientFriends.length > 0 && !selectedClient) {
        setSelectedClient(clientFriends[0]);
        await loadGamesForClient(clientFriends[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setLoading(false);
    }
  };

  const loadGamesForClient = async (clientId: number) => {
    try {
      setLoading(true);
      const gamesData = await gamesApi.getGamesForClient(clientId);
      setGames(gamesData);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedClient) {
      await loadGamesForClient(selectedClient.id);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleClientChange = (client: Friend) => {
    setSelectedClient(client);
    loadGamesForClient(client.id);
  };

  const handlePlayGame = (game: Game) => {
    // In a real app, this would open the game or redirect to the game URL
    Alert.alert(
      'Play Game',
      `Would you like to play ${game.display_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Play',
          onPress: () => {
            // Could open a WebView or external link
            console.log('Playing game:', game.name);
          },
        },
      ]
    );
  };

  const filteredGames = games.filter((game) =>
    game.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGame = ({ item }: { item: Game }) => (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => handlePlayGame(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getFileUrl(item.icon_url) }}
        style={styles.gameImage}
        contentFit="cover"
        placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
      />
      <View style={styles.gameInfo}>
        <Text style={styles.gameName} numberOfLines={1}>
          {item.display_name}
        </Text>
        {item.category && (
          <Badge text={item.category} variant="default" size="sm" />
        )}
      </View>
      <View style={styles.playButton}>
        <Ionicons name="play-circle" size={32} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );

  if (loading && games.length === 0) {
    return <Loading fullScreen text="Loading games..." />;
  }

  return (
    <View style={styles.container}>
      {/* Client Selector */}
      {clients.length > 0 && (
        <View style={styles.clientSelector}>
          <Text style={styles.clientLabel}>Select Client:</Text>
          <FlatList
            horizontal
            data={clients}
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.clientChip,
                  selectedClient?.id === item.id && styles.clientChipActive,
                ]}
                onPress={() => handleClientChange(item)}
              >
                <Text
                  style={[
                    styles.clientChipText,
                    selectedClient?.id === item.id && styles.clientChipTextActive,
                  ]}
                >
                  {item.username}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search games..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchInput}
        />
      </View>

      {/* Games Grid */}
      {filteredGames.length === 0 ? (
        <EmptyState
          icon="game-controller-outline"
          title="No Games Available"
          description={
            clients.length === 0
              ? "Connect with a client to see their games"
              : "No games found for this client"
          }
        />
      ) : (
        <FlatList
          data={filteredGames}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          renderItem={renderGame}
          contentContainerStyle={styles.gamesList}
          columnWrapperStyle={styles.gamesRow}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  clientSelector: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  clientLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  clientChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clientChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  clientChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  clientChipTextActive: {
    color: Colors.background,
    fontWeight: FontWeight.medium,
  },
  searchContainer: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  searchInput: {
    marginBottom: 0,
  },
  gamesList: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  gamesRow: {
    justifyContent: 'space-between',
  },
  gameCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  gameImage: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.surfaceLight,
  },
  gameInfo: {
    padding: Spacing.sm,
  },
  gameName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  playButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
});
