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
  TextInput,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { gameCredentialsApi } from '../../src/api/gameCredentials.api';
import { gamesApi } from '../../src/api/games.api';
import { friendsApi } from '../../src/api/friends.api';
import { Card, Avatar, Loading, EmptyState, Button } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { GameCredential, Friend, ClientGame } from '../../src/types';

interface CredentialsByPlayer {
  player: Friend;
  credentials: GameCredential[];
}

export default function ClientCredentialsScreen() {
  const [credentialsByPlayer, setCredentialsByPlayer] = useState<CredentialsByPlayer[]>([]);
  const [players, setPlayers] = useState<Friend[]>([]);
  const [clientGames, setClientGames] = useState<ClientGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add/Edit credential modal
  const [showModal, setShowModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState<GameCredential | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [credentialUsername, setCredentialUsername] = useState('');
  const [credentialPassword, setCredentialPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      // Get all players (friends who are players)
      const friends = await friendsApi.getFriends();
      const playerFriends = friends.filter((f) => f.user_type === 'player');
      setPlayers(playerFriends);

      // Get client games
      const games = await gamesApi.getClientGames();
      setClientGames(games);

      // Get credentials for each player
      const credentialPromises = playerFriends.map(async (player) => {
        try {
          const credentials = await gameCredentialsApi.getPlayerCredentials(player.id);
          return { player, credentials };
        } catch (error) {
          return { player, credentials: [] };
        }
      });

      const results = await Promise.all(credentialPromises);
      // Filter to only show players with credentials or include all for adding
      setCredentialsByPlayer(results);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenAddCredential = (playerId?: number) => {
    setEditingCredential(null);
    setSelectedPlayerId(playerId || null);
    setSelectedGameId(null);
    setCredentialUsername('');
    setCredentialPassword('');
    setShowModal(true);
  };

  const handleOpenEditCredential = (credential: GameCredential, playerId: number) => {
    setEditingCredential(credential);
    setSelectedPlayerId(playerId);
    setSelectedGameId(credential.game_id);
    setCredentialUsername(credential.game_username);
    setCredentialPassword(credential.game_password);
    setShowModal(true);
  };

  const handleSaveCredential = async () => {
    if (!selectedPlayerId) {
      Alert.alert('Error', 'Please select a player');
      return;
    }
    if (!selectedGameId) {
      Alert.alert('Error', 'Please select a game');
      return;
    }
    if (!credentialUsername.trim() || !credentialPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      if (editingCredential) {
        await gameCredentialsApi.updateCredentials(editingCredential.id, {
          game_username: credentialUsername.trim(),
          game_password: credentialPassword.trim(),
        });
        Alert.alert('Success', 'Credential updated successfully');
      } else {
        await gameCredentialsApi.createCredentials({
          player_id: selectedPlayerId,
          game_id: selectedGameId,
          game_username: credentialUsername.trim(),
          game_password: credentialPassword.trim(),
        });
        Alert.alert('Success', 'Credential created successfully');
      }

      setShowModal(false);
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to save credential');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCredential = (credential: GameCredential) => {
    Alert.alert(
      'Delete Credential',
      `Are you sure you want to delete the credential for ${credential.game_display_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await gameCredentialsApi.deleteCredentials(credential.id);
              await loadData();
              Alert.alert('Success', 'Credential deleted');
            } catch (error: any) {
              Alert.alert('Error', error?.detail || 'Failed to delete credential');
            }
          },
        },
      ]
    );
  };

  const renderCredentialItem = (credential: GameCredential, playerId: number) => (
    <View key={credential.id} style={styles.credentialItem}>
      <View style={styles.credentialItemLeft}>
        <Ionicons name="game-controller" size={20} color={Colors.primary} />
        <View style={styles.credentialItemInfo}>
          <Text style={styles.credentialGameName}>{credential.game_display_name}</Text>
          <Text style={styles.credentialDetails}>
            {credential.game_username} / {credential.game_password}
          </Text>
        </View>
      </View>
      <View style={styles.credentialItemActions}>
        <TouchableOpacity
          onPress={() => handleOpenEditCredential(credential, playerId)}
          style={styles.actionButton}
        >
          <Ionicons name="pencil" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteCredential(credential)}
          style={styles.actionButton}
        >
          <Ionicons name="trash" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlayerSection = ({ item }: { item: CredentialsByPlayer }) => (
    <Card style={styles.playerCard}>
      <View style={styles.playerHeader}>
        <View style={styles.playerInfo}>
          <Avatar
            source={item.player.profile_picture}
            name={item.player.full_name || item.player.username}
            size="md"
          />
          <View style={styles.playerDetails}>
            <Text style={styles.playerName}>
              {item.player.full_name || item.player.username}
            </Text>
            <Text style={styles.playerUsername}>@{item.player.username}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleOpenAddCredential(item.player.id)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {item.credentials.length > 0 ? (
        <View style={styles.credentialsList}>
          {item.credentials.map((cred) => renderCredentialItem(cred, item.player.id))}
        </View>
      ) : (
        <View style={styles.noCredentials}>
          <Text style={styles.noCredentialsText}>No credentials assigned</Text>
          <TouchableOpacity
            onPress={() => handleOpenAddCredential(item.player.id)}
            style={styles.addCredentialLink}
          >
            <Text style={styles.addCredentialLinkText}>Add credentials</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );

  if (loading) {
    return <Loading fullScreen text="Loading credentials..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Player Credentials</Text>
            <Text style={styles.subtitle}>Manage game login credentials for your players</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleOpenAddCredential()}
            style={styles.headerAddButton}
          >
            <Ionicons name="add-circle" size={32} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={credentialsByPlayer}
        keyExtractor={(item) => item.player.id.toString()}
        renderItem={renderPlayerSection}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No Players Yet"
            description="Add players to your friends list to assign game credentials to them."
          />
        }
      />

      {/* Add/Edit Credential Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCredential ? 'Edit Credential' : 'Add Credential'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Player Selection - only for new credentials */}
              {!editingCredential && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Select Player</Text>
                  <View style={styles.playerSelector}>
                    {players.map((player) => (
                      <TouchableOpacity
                        key={player.id}
                        style={[
                          styles.playerOption,
                          selectedPlayerId === player.id && styles.playerOptionSelected,
                        ]}
                        onPress={() => setSelectedPlayerId(player.id)}
                      >
                        <Avatar
                          source={player.profile_picture}
                          name={player.full_name || player.username}
                          size="xs"
                        />
                        <Text
                          style={[
                            styles.playerOptionText,
                            selectedPlayerId === player.id && styles.playerOptionTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {player.full_name || player.username}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {players.length === 0 && (
                    <Text style={styles.noPlayersText}>No players found. Add players first.</Text>
                  )}
                </View>
              )}

              {/* Game Selection - only for new credentials */}
              {!editingCredential && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Select Game</Text>
                  <View style={styles.gameSelector}>
                    {clientGames.map((clientGame) => (
                      <TouchableOpacity
                        key={clientGame.id}
                        style={[
                          styles.gameOption,
                          selectedGameId === clientGame.game_id && styles.gameOptionSelected,
                        ]}
                        onPress={() => setSelectedGameId(clientGame.game_id)}
                      >
                        <Ionicons
                          name="game-controller"
                          size={18}
                          color={
                            selectedGameId === clientGame.game_id
                              ? Colors.primary
                              : Colors.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.gameOptionText,
                            selectedGameId === clientGame.game_id && styles.gameOptionTextSelected,
                          ]}
                        >
                          {clientGame.game?.display_name || `Game ${clientGame.game_id}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {clientGames.length === 0 && (
                    <Text style={styles.noGamesText}>No games configured. Go to Settings → Manage Games to add games.</Text>
                  )}
                </View>
              )}

              {/* Username Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Game Username</Text>
                <TextInput
                  style={styles.formInput}
                  value={credentialUsername}
                  onChangeText={setCredentialUsername}
                  placeholder="Enter game username"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              {/* Password Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Game Password</Text>
                <TextInput
                  style={styles.formInput}
                  value={credentialPassword}
                  onChangeText={setCredentialPassword}
                  placeholder="Enter game password"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              {/* Save Button */}
              <Button
                title={saving ? 'Saving...' : editingCredential ? 'Update Credential' : 'Add Credential'}
                onPress={handleSaveCredential}
                loading={saving}
                style={styles.saveButton}
              />
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
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  headerAddButton: {
    padding: Spacing.xs,
  },
  listContent: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  playerCard: {
    marginBottom: Spacing.md,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playerDetails: {
    marginLeft: Spacing.xs,
  },
  playerName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  playerUsername: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  credentialsList: {
    marginTop: Spacing.md,
  },
  credentialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  credentialItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  credentialItemInfo: {
    flex: 1,
  },
  credentialGameName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  credentialDetails: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  credentialItemActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  noCredentials: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  noCredentialsText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  addCredentialLink: {
    marginTop: Spacing.sm,
  },
  addCredentialLinkText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayMedium,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
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
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
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
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playerSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  playerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playerOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  playerOptionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    maxWidth: 100,
  },
  playerOptionTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  noPlayersText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
  gameSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  gameOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gameOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  gameOptionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  gameOptionTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  noGamesText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
  saveButton: {
    marginTop: Spacing.md,
  },
});
