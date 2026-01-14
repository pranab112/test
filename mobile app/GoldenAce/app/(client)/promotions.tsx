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
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { promotionsApi, Promotion, PromotionClaim, CreatePromotionData } from '../../src/api/promotions.api';
import { Card, Badge, Loading, EmptyState, Button, Input, Avatar } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';

type TabType = 'active' | 'pending' | 'all';

export default function ClientPromotionsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [pendingClaims, setPendingClaims] = useState<PromotionClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingClaimId, setProcessingClaimId] = useState<number | null>(null);

  // Create/Edit Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value: '',
    end_date: '',
    max_claims_per_player: '1',
    total_budget: '',
    min_player_level: '1',
    terms: '',
    wagering_requirement: '1',
  });

  const loadData = async () => {
    try {
      const [promoData, pendingData] = await Promise.all([
        promotionsApi.getMyPromotions(),
        promotionsApi.getPendingApprovals(),
      ]);
      setPromotions(promoData);
      setPendingClaims(pendingData);
    } catch (error) {
      console.error('Error loading promotions:', error);
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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      value: '',
      end_date: '',
      max_claims_per_player: '1',
      total_budget: '',
      min_player_level: '1',
      terms: '',
      wagering_requirement: '1',
    });
  };

  const handleCreatePromotion = async () => {
    if (!formData.title || !formData.value || !formData.end_date) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const data: CreatePromotionData = {
        title: formData.title,
        description: formData.description,
        promotion_type: 'gc_bonus',
        value: parseInt(formData.value),
        end_date: formData.end_date,
        max_claims_per_player: parseInt(formData.max_claims_per_player) || 1,
        total_budget: formData.total_budget ? parseInt(formData.total_budget) : undefined,
        min_player_level: parseInt(formData.min_player_level) || 1,
        terms: formData.terms || undefined,
        wagering_requirement: parseInt(formData.wagering_requirement) || 1,
      };

      await promotionsApi.createPromotion(data);
      Alert.alert('Success', 'Promotion created successfully');
      setShowCreateModal(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to create promotion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPromotion = async () => {
    if (!selectedPromotion) return;

    setSubmitting(true);
    try {
      await promotionsApi.updatePromotion(selectedPromotion.id, {
        title: formData.title,
        description: formData.description,
        value: parseInt(formData.value),
        end_date: formData.end_date,
        max_claims_per_player: parseInt(formData.max_claims_per_player) || 1,
        total_budget: formData.total_budget ? parseInt(formData.total_budget) : undefined,
        min_player_level: parseInt(formData.min_player_level) || 1,
        terms: formData.terms || undefined,
        wagering_requirement: parseInt(formData.wagering_requirement) || 1,
      });
      Alert.alert('Success', 'Promotion updated successfully');
      setShowEditModal(false);
      setSelectedPromotion(null);
      resetForm();
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to update promotion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPromotion = (promotion: Promotion) => {
    Alert.alert(
      'Cancel Promotion',
      `Are you sure you want to cancel "${promotion.title}"? This will prevent any more claims.`,
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Cancel Promotion',
          style: 'destructive',
          onPress: async () => {
            try {
              await promotionsApi.cancelPromotion(promotion.id);
              Alert.alert('Success', 'Promotion cancelled');
              await loadData();
            } catch (error: any) {
              Alert.alert('Error', error?.detail || 'Failed to cancel promotion');
            }
          },
        },
      ]
    );
  };

  const handleApproveClaim = async (claimId: number) => {
    setProcessingClaimId(claimId);
    try {
      await promotionsApi.approveClaim(claimId);
      Alert.alert('Success', 'Claim approved');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to approve claim');
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleRejectClaim = async (claimId: number) => {
    Alert.alert(
      'Reject Claim',
      'Are you sure you want to reject this claim?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingClaimId(claimId);
            try {
              await promotionsApi.rejectClaim(claimId);
              Alert.alert('Success', 'Claim rejected');
              await loadData();
            } catch (error: any) {
              Alert.alert('Error', error?.detail || 'Failed to reject claim');
            } finally {
              setProcessingClaimId(null);
            }
          },
        },
      ]
    );
  };

  const openEditModal = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setFormData({
      title: promotion.title,
      description: promotion.description,
      value: promotion.value.toString(),
      end_date: promotion.end_date.split('T')[0],
      max_claims_per_player: promotion.max_claims_per_player.toString(),
      total_budget: promotion.total_budget?.toString() || '',
      min_player_level: promotion.min_player_level.toString(),
      terms: promotion.terms || '',
      wagering_requirement: promotion.wagering_requirement.toString(),
    });
    setShowEditModal(true);
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'expired':
        return 'default';
      case 'depleted':
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredPromotions = promotions.filter((promo) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return false;
    return promo.status === activeTab;
  });

  const stats = {
    active: promotions.filter((p) => p.status === 'active').length,
    totalClaims: promotions.reduce((sum, p) => sum + p.claims_count, 0),
    gcUsed: promotions.reduce((sum, p) => sum + p.used_budget, 0),
    pendingApprovals: pendingClaims.length,
  };

  const renderPromotion = ({ item }: { item: Promotion }) => (
    <Card style={styles.promotionCard}>
      <View style={styles.promotionHeader}>
        <View style={styles.promotionInfo}>
          <Text style={styles.promotionTitle}>{item.title}</Text>
          <View style={styles.badgeRow}>
            <Badge
              text={item.status.toUpperCase()}
              variant={getStatusVariant(item.status)}
              size="sm"
            />
            <Badge text="GC Bonus" variant="warning" size="sm" />
          </View>
        </View>
        {item.status === 'active' && (
          <View style={styles.promotionActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openEditModal(item)}
            >
              <Ionicons name="create" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelPromotion(item)}
            >
              <Ionicons name="close" size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.promotionDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.statsGrid}>
        <View style={styles.statGridItem}>
          <Text style={styles.statGridLabel}>Value</Text>
          <Text style={styles.statGridValue}>{item.value} GC</Text>
        </View>
        <View style={styles.statGridItem}>
          <Text style={styles.statGridLabel}>Claims</Text>
          <Text style={styles.statGridValue}>{item.claims_count}</Text>
        </View>
        <View style={styles.statGridItem}>
          <Text style={styles.statGridLabel}>Min Level</Text>
          <Text style={styles.statGridValue}>Lv {item.min_player_level}</Text>
        </View>
        <View style={styles.statGridItem}>
          <Text style={styles.statGridLabel}>Expires</Text>
          <Text style={styles.statGridValue}>
            {new Date(item.end_date).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {item.total_budget && (
        <View style={styles.budgetSection}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetLabel}>GC Used</Text>
            <Text style={styles.budgetValue}>
              {item.used_budget.toLocaleString()} / {item.total_budget.toLocaleString()} GC
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, (item.used_budget / item.total_budget) * 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      )}
    </Card>
  );

  const renderPendingClaim = ({ item }: { item: PromotionClaim }) => (
    <Card style={styles.pendingClaimCard}>
      <View style={styles.pendingClaimHeader}>
        <View style={styles.pendingClaimInfo}>
          <Text style={styles.pendingClaimTitle}>{item.promotion_title}</Text>
          <View style={styles.badgeRow}>
            <Badge text="Pending Approval" variant="warning" size="sm" />
            <Badge text="GC Bonus" variant="default" size="sm" />
          </View>
        </View>
        <Text style={styles.pendingClaimValue}>{item.value} GC</Text>
      </View>

      <View style={styles.playerRow}>
        <Avatar
          name={item.player_username || `Player ${item.player_id}`}
          size="sm"
        />
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{item.player_username || `Player #${item.player_id}`}</Text>
          <Text style={styles.claimDate}>
            Level {item.player_level || 1} • Claimed {new Date(item.claimed_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.claimActions}>
        <Button
          title="Reject"
          onPress={() => handleRejectClaim(item.claim_id)}
          variant="outline"
          size="sm"
          style={styles.rejectButton}
          textStyle={{ color: Colors.error }}
          loading={processingClaimId === item.claim_id}
        />
        <Button
          title="Approve"
          onPress={() => handleApproveClaim(item.claim_id)}
          size="sm"
          style={styles.approveButton}
          icon={<Ionicons name="checkmark" size={16} color={Colors.background} />}
          loading={processingClaimId === item.claim_id}
        />
      </View>
    </Card>
  );

  const renderFormModal = (isEdit: boolean) => (
    <Modal
      visible={isEdit ? showEditModal : showCreateModal}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (isEdit) {
          setShowEditModal(false);
          setSelectedPromotion(null);
        } else {
          setShowCreateModal(false);
        }
        resetForm();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEdit ? 'Edit Promotion' : 'Create Promotion'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (isEdit) {
                  setShowEditModal(false);
                  setSelectedPromotion(null);
                } else {
                  setShowCreateModal(false);
                }
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Input
              label="Promotion Title *"
              placeholder="Enter title..."
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Enter description..."
                placeholderTextColor={Colors.textMuted}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Type</Text>
              <View style={styles.typeDisplay}>
                <Text style={styles.typeText}>GC Bonus</Text>
                <Text style={styles.typeSubtext}>(Game Credits)</Text>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formRowItem}>
                <Input
                  label="Value (GC) *"
                  placeholder="100"
                  value={formData.value}
                  onChangeText={(text) => setFormData({ ...formData, value: text })}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.formRowItem}>
                <Input
                  label="Max Claims/Player"
                  placeholder="1"
                  value={formData.max_claims_per_player}
                  onChangeText={(text) => setFormData({ ...formData, max_claims_per_player: text })}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formRowItem}>
                <Input
                  label="End Date *"
                  placeholder="YYYY-MM-DD"
                  value={formData.end_date}
                  onChangeText={(text) => setFormData({ ...formData, end_date: text })}
                />
              </View>
              <View style={styles.formRowItem}>
                <Input
                  label="Total Budget (GC)"
                  placeholder="Unlimited"
                  value={formData.total_budget}
                  onChangeText={(text) => setFormData({ ...formData, total_budget: text })}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formRowItem}>
                <Input
                  label="Min Player Level"
                  placeholder="1"
                  value={formData.min_player_level}
                  onChangeText={(text) => setFormData({ ...formData, min_player_level: text })}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.formRowItem}>
                <Input
                  label="Wagering Req."
                  placeholder="1x"
                  value={formData.wagering_requirement}
                  onChangeText={(text) => setFormData({ ...formData, wagering_requirement: text })}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Terms & Conditions</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Enter terms..."
                placeholderTextColor={Colors.textMuted}
                value={formData.terms}
                onChangeText={(text) => setFormData({ ...formData, terms: text })}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.noteSection}>
              <Ionicons name="information-circle" size={18} color={Colors.info} />
              <Text style={styles.noteText}>
                When players claim this promotion, you will need to approve their claims. GC will be deducted from your balance when approved.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  if (isEdit) {
                    setShowEditModal(false);
                    setSelectedPromotion(null);
                  } else {
                    setShowCreateModal(false);
                  }
                  resetForm();
                }}
                variant="outline"
                style={styles.cancelModalButton}
              />
              <Button
                title={isEdit ? 'Save Changes' : 'Create Promotion'}
                onPress={isEdit ? handleEditPromotion : handleCreatePromotion}
                loading={submitting}
                style={styles.submitButton}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return <Loading fullScreen text="Loading promotions..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header with Create Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Promotions</Text>
        <Button
          title="Create"
          onPress={() => setShowCreateModal(true)}
          size="sm"
          icon={<Ionicons name="add" size={18} color={Colors.background} />}
        />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.success }]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.warning }]}>{stats.pendingApprovals}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalClaims}</Text>
          <Text style={styles.statLabel}>Claims</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.primary }]}>{stats.gcUsed}</Text>
          <Text style={styles.statLabel}>GC Used</Text>
        </View>
      </View>

      {/* Pending Claims Alert */}
      {pendingClaims.length > 0 && (
        <TouchableOpacity
          style={styles.pendingAlert}
          onPress={() => setActiveTab('pending')}
        >
          <Ionicons name="hourglass" size={20} color={Colors.warning} />
          <Text style={styles.pendingAlertText}>
            {pendingClaims.length} claim{pendingClaims.length > 1 ? 's' : ''} waiting for approval
          </Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.warning} />
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['active', 'pending', 'all'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'pending' ? 'Approvals' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {tab === 'pending' && pendingClaims.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{pendingClaims.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'pending' ? (
        <FlatList
          data={pendingClaims}
          keyExtractor={(item) => item.claim_id.toString()}
          renderItem={renderPendingClaim}
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
              icon="checkmark-circle-outline"
              title="No Pending Claims"
              description="All claims have been processed"
            />
          }
        />
      ) : (
        <FlatList
          data={filteredPromotions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPromotion}
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
              icon="gift-outline"
              title="No Promotions"
              description="Create your first promotion to attract players"
              actionLabel="Create Promotion"
              onAction={() => setShowCreateModal(true)}
            />
          }
        />
      )}

      {/* Modals */}
      {renderFormModal(false)}
      {renderFormModal(true)}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    margin: Spacing.md,
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
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pendingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
    gap: Spacing.sm,
  },
  pendingAlertText: {
    flex: 1,
    color: Colors.warning,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
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
  tabBadge: {
    backgroundColor: Colors.warning,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.background,
  },
  list: {
    padding: Spacing.md,
  },
  promotionCard: {
    marginBottom: Spacing.md,
  },
  promotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  promotionInfo: {
    flex: 1,
  },
  promotionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  promotionActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
  },
  cancelButton: {
    backgroundColor: Colors.error + '20',
  },
  promotionDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  statGridItem: {
    flex: 1,
  },
  statGridLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  statGridValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  budgetSection: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  budgetLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  budgetValue: {
    fontSize: FontSize.xs,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  pendingClaimCard: {
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  pendingClaimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  pendingClaimInfo: {
    flex: 1,
  },
  pendingClaimTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  pendingClaimValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  playerInfo: {
    marginLeft: Spacing.sm,
  },
  playerName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  claimDate: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  claimActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rejectButton: {
    flex: 1,
    borderColor: Colors.error,
  },
  approveButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  formField: {
    marginBottom: Spacing.md,
  },
  formLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  textArea: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  typeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  typeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
  },
  typeSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  formRowItem: {
    flex: 1,
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.info + '20',
    borderWidth: 1,
    borderColor: Colors.info,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  noteText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.info,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cancelModalButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});
