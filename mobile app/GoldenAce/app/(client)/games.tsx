import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { gamesApi } from '../../src/api/games.api';
import { Card, Badge, Loading, EmptyState, Input, Button } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import { getFileUrl } from '../../src/config/api.config';
import type { Game, ClientGame } from '../../src/types';

export default function ClientGamesScreen() {
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [myGames, setMyGames] = useState<ClientGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [gamesData, clientGamesData] = await Promise.all([
        gamesApi.getAllGames(),
        gamesApi.getClientGames(),
      ]);
      setAllGames(gamesData);
      setMyGames(clientGamesData);
      setSelectedGameIds(clientGamesData.map((g) => g.game_id));
    } catch (error) {
      console.error('Error loading games:', error);
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

  const handleSaveGames = async () => {
    setSaving(true);
    try {
      await gamesApi.selectGames(selectedGameIds);
      Alert.alert('Success', 'Games updated successfully');
      setShowAddModal(false);
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to update games');
    } finally {
      setSaving(false);
    }
  };

  const toggleGameSelection = (gameId: number) => {
    setSelectedGameIds((prev) =>
      prev.includes(gameId)
        ? prev.filter((id) => id !== gameId)
        : [...prev, gameId]
    );
  };

  const filteredGames = myGames.filter((game) =>
    game.game?.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.game?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMyGame = ({ item }: { item: ClientGame }) => (
    <View style={styles.gameCard}>
      <Image
        source={{ uri: getFileUrl(item.custom_image_url || item.game?.icon_url) }}
        style={styles.gameImage}
        contentFit="cover"
        placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
      />
      <View style={styles.gameInfo}>
        <Text style={styles.gameName} numberOfLines={1}>
          {item.game?.display_name}
        </Text>
        <View style={styles.gameMeta}>
          {item.game?.category && (
            <Badge text={item.game.category} variant="default" size="sm" />
          )}
          <Badge
            text={item.is_active ? 'Active' : 'Inactive'}
            variant={item.is_active ? 'success' : 'default'}
            size="sm"
          />
        </View>
        {item.game_link && (
          <Text style={styles.gameLink} numberOfLines={1}>
            {item.game_link}
          </Text>
        )}
      </View>
    </View>
  );

  const renderAvailableGame = ({ item }: { item: Game }) => {
    const isSelected = selectedGameIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.availableGameCard,
          isSelected && styles.availableGameCardSelected,
        ]}
        onPress={() => toggleGameSelection(item.id)}
      >
        <Image
          source={{ uri: getFileUrl(item.icon_url) }}
          style={styles.availableGameImage}
          contentFit="cover"
        />
        <View style={styles.availableGameInfo}>
          <Text style={styles.availableGameName} numberOfLines={1}>
            {item.display_name}
          </Text>
          {item.category && (
            <Text style={styles.availableGameCategory}>{item.category}</Text>
          )}
        </View>
        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
          ]}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={16} color={Colors.background} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading fullScreen text="Loading games..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      <View style={styles.header}>
        <Input
          placeholder="Search games..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          containerStyle={styles.searchInput}
        />
        <Button
          title="Add"
          onPress={() => setShowAddModal(true)}
          size="md"
          icon={<Ionicons name="add" size={18} color={Colors.background} />}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {myGames.length} games selected • {myGames.filter((g) => g.is_active).length} active
        </Text>
      </View>

      {/* Games List */}
      <FlatList
        data={filteredGames}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMyGame}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="game-controller-outline"
            title="No Games Selected"
            description="Add games to offer to your players"
            actionLabel="Add Games"
            onAction={() => setShowAddModal(true)}
          />
        }
      />

      {/* Add Games Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Games</Text>
            <Button
              title="Save"
              onPress={handleSaveGames}
              loading={saving}
              size="sm"
            />
          </View>

          <Text style={styles.selectedCount}>
            {selectedGameIds.length} games selected
          </Text>

          <FlatList
            data={allGames}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderAvailableGame}
            contentContainerStyle={styles.modalList}
          />
        </View>
      </Modal>
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
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  statsContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  statsText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  list: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  row: {
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
    height: 100,
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
  gameMeta: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  gameLink: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  selectedCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },
  modalList: {
    padding: Spacing.md,
  },
  availableGameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  availableGameCardSelected: {
    borderColor: Colors.primary,
  },
  availableGameImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
  },
  availableGameInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  availableGameName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  availableGameCategory: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});
