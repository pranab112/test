import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { gamesApi } from '../../src/api/games.api';
import { Card, Loading, Avatar } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Game, ClientGame } from '../../src/types';

export default function ManageGamesScreen() {
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [myGames, setMyGames] = useState<ClientGame[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadData = async () => {
    try {
      console.log('[Games Screen] Loading games data...');
      const [games, clientGames] = await Promise.all([
        gamesApi.getAllGames(),
        gamesApi.getClientGames(),
      ]);
      console.log('[Games Screen] All games received:', games?.length || 0);
      console.log('[Games Screen] Client games received:', clientGames?.length || 0);
      setAllGames(games || []);
      setMyGames(clientGames || []);
      // Set initially selected game IDs
      const initialSelected = (clientGames || []).map((cg) => cg.game_id);
      setSelectedGameIds(initialSelected);
      console.log('[Games Screen] Data loaded successfully');
    } catch (error) {
      console.error('[Games Screen] Error loading games:', error);
      Alert.alert('Error', 'Failed to load games');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const toggleGame = (gameId: number) => {
    setSelectedGameIds((prev) => {
      const newSelection = prev.includes(gameId)
        ? prev.filter((id) => id !== gameId)
        : [...prev, gameId];

      // Check if there are changes from initial selection
      const initialSelected = myGames.map((cg) => cg.game_id);
      const hasChanged =
        newSelection.length !== initialSelected.length ||
        newSelection.some((id) => !initialSelected.includes(id)) ||
        initialSelected.some((id) => !newSelection.includes(id));
      setHasChanges(hasChanged);

      return newSelection;
    });
  };

  const handleSave = async () => {
    if (selectedGameIds.length === 0) {
      Alert.alert('Error', 'Please select at least one game');
      return;
    }

    setSaving(true);
    try {
      await gamesApi.selectGames(selectedGameIds);
      Alert.alert('Success', 'Games updated successfully');
      setHasChanges(false);
      // Reload to get updated data
      loadData();
    } catch (error: any) {
      console.error('Error saving games:', error);
      Alert.alert('Error', error?.detail || 'Failed to update games');
    } finally {
      setSaving(false);
    }
  };

  const renderGame = ({ item }: { item: Game }) => {
    const isSelected = selectedGameIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.gameCard, isSelected && styles.gameCardSelected]}
        onPress={() => toggleGame(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.gameInfo}>
          <View style={[styles.gameIcon, isSelected && styles.gameIconSelected]}>
            <Ionicons
              name="game-controller"
              size={24}
              color={isSelected ? Colors.primary : Colors.textSecondary}
            />
          </View>
          <View style={styles.gameDetails}>
            <Text style={styles.gameName}>{item.display_name}</Text>
            {item.description && (
              <Text style={styles.gameDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <Ionicons name="checkmark" size={18} color={Colors.background} />
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
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Ionicons name="information-circle" size={20} color={Colors.info} />
          <Text style={styles.headerText}>
            Select the games you want to offer to your players. Players will be able to see credentials for selected games.
          </Text>
        </View>
        <View style={styles.selectedCount}>
          <Text style={styles.selectedCountText}>
            {selectedGameIds.length} game{selectedGameIds.length !== 1 ? 's' : ''} selected
          </Text>
        </View>
      </View>

      {/* Games List */}
      <FlatList
        data={allGames}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderGame}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="game-controller-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No games available</Text>
            <Text style={styles.emptySubtext}>
              Contact admin to add games to the platform
            </Text>
          </View>
        }
      />

      {/* Save Button */}
      {hasChanges && (
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Text style={styles.saveButtonText}>Saving...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={Colors.background} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
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
  header: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.info + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  headerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  selectedCount: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  selectedCountText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  list: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  gameCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  gameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gameIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  gameIconSelected: {
    backgroundColor: Colors.primary + '20',
  },
  gameDetails: {
    flex: 1,
  },
  gameName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  gameDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
});
