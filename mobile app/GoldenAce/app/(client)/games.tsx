import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Switch,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { gamesApi } from '../../src/api/games.api';
import { Loading } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Game, ClientGame } from '../../src/types';

type TabType = 'my-games' | 'library';

export default function ManageGamesScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('my-games');
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [myGames, setMyGames] = useState<ClientGame[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<ClientGame | null>(null);
  const [editFormData, setEditFormData] = useState({
    game_link: '',
    custom_image_url: '',
    is_active: true,
  });

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

      // Only include game IDs that exist in the available games list
      const validGameIds = new Set<number>();
      const availableGameIds = new Set((games || []).map(g => g.id));

      (clientGames || []).forEach(cg => {
        if (availableGameIds.has(cg.game_id)) {
          validGameIds.add(cg.game_id);
        }
      });

      setSelectedGameIds(validGameIds);
      console.log('[Games Screen] Data loaded successfully');
    } catch (error: any) {
      console.error('[Games Screen] Error loading games:', JSON.stringify(error, null, 2));
      let errorMsg = 'Failed to load games. Please try again.';
      if (error?.error?.message) {
        errorMsg = error.error.message;
      } else if (error?.detail) {
        errorMsg = error.detail;
      } else if (error?.message) {
        errorMsg = error.message;
      }
      Alert.alert('Error', errorMsg);
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

  const handleAddGame = (gameId: number) => {
    const newSelected = new Set(selectedGameIds);
    newSelected.add(gameId);
    setSelectedGameIds(newSelected);
  };

  const handleRemoveGame = (gameId: number) => {
    const newSelected = new Set(selectedGameIds);
    newSelected.delete(gameId);
    setSelectedGameIds(newSelected);
  };

  const handleSaveSelection = async () => {
    setSaving(true);
    try {
      // Only send game IDs that exist in the current available games list
      const validGameIds = Array.from(selectedGameIds).filter(id =>
        allGames.some(game => game.id === id && game.is_active)
      );

      if (validGameIds.length !== selectedGameIds.size) {
        setSelectedGameIds(new Set(validGameIds));
        Alert.alert('Notice', 'Some games are no longer available and were removed from selection');
      }

      await gamesApi.selectGames(validGameIds);
      Alert.alert('Success', 'Game selection updated successfully');
      loadData();
      setActiveTab('my-games');
    } catch (error: any) {
      const errorMessage = error?.detail || error?.message || 'Failed to update game selection';
      Alert.alert('Error', errorMessage);
      console.error(error);
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleEditGame = (game: ClientGame) => {
    setEditingGame(game);
    setEditFormData({
      game_link: game.game_link || '',
      custom_image_url: game.custom_image_url || '',
      is_active: game.is_active,
    });
    setEditModalOpen(true);
  };

  const handleUpdateGame = async () => {
    if (!editingGame) return;

    setSaving(true);
    try {
      await gamesApi.updateClientGame(editingGame.id, editFormData);
      Alert.alert('Success', 'Game updated successfully');
      setEditModalOpen(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to update game');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Filter games based on search
  const filteredLibraryGames = allGames.filter(game => {
    const matchesSearch = game.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          game.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && game.is_active;
  });

  const filteredClientGames = myGames.filter(cg => {
    if (!cg.game) return false;
    const matchesSearch = cg.game.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cg.game.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Check if there are unsaved changes
  const hasChanges = (() => {
    const currentIds = Array.from(selectedGameIds).sort();
    const originalIds = myGames.map(cg => cg.game_id).sort();
    if (currentIds.length !== originalIds.length) return true;
    return currentIds.some((id, index) => id !== originalIds[index]);
  })();

  const renderMyGameItem = ({ item }: { item: ClientGame }) => {
    if (!item.game) return null;

    return (
      <View style={styles.myGameCard}>
        <View style={styles.gameImageContainer}>
          {item.custom_image_url || item.game?.icon_url ? (
            <Image
              source={{ uri: item.custom_image_url || item.game?.icon_url }}
              style={styles.gameImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.gameImagePlaceholder}>
              <Ionicons name="game-controller" size={32} color={Colors.primary} />
            </View>
          )}
          <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>{item.game?.display_name}</Text>
          <Text style={styles.gameCategory}>{item.game?.category || 'Uncategorized'}</Text>
          {item.game_link && (
            <View style={styles.gameLinkContainer}>
              <Ionicons name="link" size={12} color={Colors.primary} />
              <Text style={styles.gameLinkText} numberOfLines={1}>{item.game_link}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditGame(item)}
        >
          <Ionicons name="pencil" size={18} color={Colors.primary} />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLibraryGameItem = ({ item }: { item: Game }) => {
    const isSelected = selectedGameIds.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.libraryGameCard, isSelected && styles.libraryGameCardSelected]}
        onPress={() => isSelected ? handleRemoveGame(item.id) : handleAddGame(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.gameImageContainer}>
          {item.icon_url ? (
            <Image
              source={{ uri: item.icon_url }}
              style={styles.gameImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.gameImagePlaceholder}>
              <Ionicons name="game-controller" size={32} color={Colors.primary} />
            </View>
          )}
          {isSelected && (
            <View style={styles.selectedOverlay}>
              <View style={styles.selectedCheckmark}>
                <Ionicons name="checkmark" size={24} color={Colors.background} />
              </View>
            </View>
          )}
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName}>{item.display_name}</Text>
          <Text style={styles.gameCategory}>{item.category || 'Uncategorized'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addRemoveButton, isSelected && styles.removeButton]}
          onPress={() => isSelected ? handleRemoveGame(item.id) : handleAddGame(item.id)}
        >
          <Ionicons
            name={isSelected ? 'remove' : 'add'}
            size={18}
            color={isSelected ? Colors.background : Colors.background}
          />
          <Text style={[styles.addRemoveButtonText, isSelected && styles.removeButtonText]}>
            {isSelected ? 'Remove' : 'Add'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading fullScreen text="Loading games..." />;
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-games' && styles.tabActive]}
          onPress={() => setActiveTab('my-games')}
        >
          <Text style={[styles.tabText, activeTab === 'my-games' && styles.tabTextActive]}>
            My Games ({myGames.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'library' && styles.tabActive]}
          onPress={() => setActiveTab('library')}
        >
          <Text style={[styles.tabText, activeTab === 'library' && styles.tabTextActive]}>
            Game Library ({allGames.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search games..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Save Button for Library Tab */}
      {activeTab === 'library' && hasChanges && (
        <TouchableOpacity
          style={[styles.saveSelectionButton, saving && styles.saveSelectionButtonDisabled]}
          onPress={handleSaveSelection}
          disabled={saving}
        >
          <Ionicons name="save" size={18} color={Colors.background} />
          <Text style={styles.saveSelectionButtonText}>
            {saving ? 'Saving...' : 'Save Selection'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Content */}
      {allGames.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="game-controller-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No games available in the library yet</Text>
          <Text style={styles.emptySubtext}>Please contact the admin to add games to the system</Text>
        </View>
      ) : activeTab === 'my-games' ? (
        filteredClientGames.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="game-controller-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No games selected yet</Text>
            <Text style={styles.emptySubtext}>Browse the game library to add games</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => setActiveTab('library')}
            >
              <Text style={styles.browseButtonText}>Browse Game Library</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredClientGames}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMyGameItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
              />
            }
          />
        )
      ) : (
        <FlatList
          data={filteredLibraryGames}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLibraryGameItem}
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
              <Ionicons name="search" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No games found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          }
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={editModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Customize: {editingGame?.game?.display_name}
              </Text>
              <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Game Link Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Game Link/URL</Text>
                <TextInput
                  style={styles.formInput}
                  value={editFormData.game_link}
                  onChangeText={(text) => setEditFormData({ ...editFormData, game_link: text })}
                  placeholder="https://your-game-link.com"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Custom Image URL Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Custom Image URL (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  value={editFormData.custom_image_url}
                  onChangeText={(text) => setEditFormData({ ...editFormData, custom_image_url: text })}
                  placeholder="https://your-image-url.com/image.jpg"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Image Preview */}
              {editFormData.custom_image_url ? (
                <View style={styles.imagePreview}>
                  <Image
                    source={{ uri: editFormData.custom_image_url }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              {/* Active Toggle */}
              <View style={styles.toggleGroup}>
                <Text style={styles.formLabel}>Game is active for players</Text>
                <Switch
                  value={editFormData.is_active}
                  onValueChange={(value) => setEditFormData({ ...editFormData, is_active: value })}
                  trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                  thumbColor={editFormData.is_active ? Colors.primary : Colors.textMuted}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleUpdateGame}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  saveSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  saveSelectionButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  saveSelectionButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  list: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  myGameCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  libraryGameCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  libraryGameCardSelected: {
    borderColor: Colors.primary,
  },
  gameImageContainer: {
    height: 120,
    backgroundColor: Colors.surfaceLight,
    position: 'relative',
  },
  gameImage: {
    width: '100%',
    height: '100%',
  },
  gameImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusActive: {
    backgroundColor: Colors.success,
  },
  statusInactive: {
    backgroundColor: Colors.error,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckmark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameInfo: {
    padding: Spacing.md,
  },
  gameName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  gameCategory: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  gameLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 4,
  },
  gameLinkText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  editButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
  },
  addRemoveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  removeButton: {
    backgroundColor: Colors.error,
  },
  addRemoveButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  removeButtonText: {
    color: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  browseButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  browseButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.background,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayMedium,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  formInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imagePreview: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.surfaceLight,
  },
  toggleGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceLight,
  },
  cancelButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
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
