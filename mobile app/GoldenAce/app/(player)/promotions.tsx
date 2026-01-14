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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { promotionsApi, Promotion, PromotionClaim } from '../../src/api/promotions.api';
import { Card, Badge, Loading, EmptyState, Button } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';

type TabType = 'available' | 'claims';

export default function PlayerPromotionsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [claims, setClaims] = useState<PromotionClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const loadData = async () => {
    try {
      const [promoData, claimsData] = await Promise.all([
        promotionsApi.getAvailablePromotions(),
        promotionsApi.getMyClaims(),
      ]);
      setPromotions(promoData);
      setClaims(claimsData.map(c => ({ ...c, id: c.claim_id })));
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

  const handleClaimPromotion = async (promotion: Promotion) => {
    setClaiming(promotion.id);
    try {
      const response = await promotionsApi.claimPromotion(promotion.id);
      if (response.success) {
        if (response.status === 'pending_approval') {
          Alert.alert('Success', 'Claim request sent! Waiting for client approval.');
        } else {
          Alert.alert('Success', response.message);
        }
        await loadData();
        setShowDetailsModal(false);
        setSelectedPromotion(null);
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to claim promotion');
    } finally {
      setClaiming(null);
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'approved':
      case 'claimed':
        return 'success';
      case 'pending_approval':
        return 'warning';
      case 'rejected':
      case 'expired':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending_approval':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'claimed':
        return 'Claimed';
      case 'used':
        return 'Used';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  const pendingClaims = claims.filter(c => c.status === 'pending_approval');
  const approvedClaims = claims.filter(c => c.status === 'approved' || c.status === 'claimed');

  const renderPromotion = ({ item }: { item: Promotion }) => (
    <Card style={styles.promotionCard}>
      <View style={styles.promotionHeader}>
        <View style={styles.promotionIconContainer}>
          <Ionicons name="gift" size={24} color={Colors.primary} />
        </View>
        <View style={styles.promotionInfo}>
          <Text style={styles.promotionTitle}>{item.title}</Text>
          <Text style={styles.clientName}>
            {item.client_company || item.client_name}
          </Text>
        </View>
        <View style={styles.valueContainer}>
          <Text style={styles.valueLabel}>Value</Text>
          <Text style={styles.valueAmount}>{item.value} GC</Text>
        </View>
      </View>

      <Text style={styles.promotionDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.promotionMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="star" size={14} color={Colors.textSecondary} />
          <Text style={styles.metaText}>Min Level {item.min_player_level}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="calendar" size={14} color={Colors.textSecondary} />
          <Text style={styles.metaText}>
            Expires {new Date(item.end_date).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.promotionActions}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => {
            setSelectedPromotion(item);
            setShowDetailsModal(true);
          }}
        >
          <Text style={styles.detailsButtonText}>Details</Text>
        </TouchableOpacity>

        {item.can_claim && !item.already_claimed ? (
          <Button
            title="Claim"
            onPress={() => handleClaimPromotion(item)}
            loading={claiming === item.id}
            size="sm"
            icon={<Ionicons name="gift" size={16} color={Colors.background} />}
            style={styles.claimButton}
          />
        ) : item.already_claimed ? (
          <View style={styles.claimedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.claimedText}>Claimed</Text>
          </View>
        ) : (
          <Badge text="Unavailable" variant="error" size="sm" />
        )}
      </View>
    </Card>
  );

  const renderClaim = ({ item }: { item: PromotionClaim }) => (
    <Card style={styles.claimCard}>
      <View style={styles.claimHeader}>
        <View style={styles.claimInfo}>
          <Text style={styles.claimTitle}>{item.promotion_title}</Text>
          <Text style={styles.claimClient}>
            {item.client_company || item.client_name}
          </Text>
        </View>
        <Badge
          text={getStatusLabel(item.status)}
          variant={getStatusColor(item.status)}
          size="sm"
        />
      </View>

      <View style={styles.claimDetails}>
        <View style={styles.claimDetail}>
          <Ionicons name="wallet" size={16} color={Colors.primary} />
          <Text style={styles.claimDetailText}>{item.claimed_value || item.value} GC</Text>
        </View>
        <View style={styles.claimDetail}>
          <Ionicons name="time" size={16} color={Colors.textSecondary} />
          <Text style={styles.claimDetailText}>
            {new Date(item.claimed_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {item.wagering_required && item.wagering_required > 0 && (
        <View style={styles.wageringSection}>
          <View style={styles.wageringHeader}>
            <Text style={styles.wageringLabel}>Wagering Progress</Text>
            <Text style={styles.wageringValue}>
              {item.wagering_completed || 0} / {item.wagering_required}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    100,
                    ((item.wagering_completed || 0) / item.wagering_required) * 100
                  )}%`,
                },
              ]}
            />
          </View>
        </View>
      )}
    </Card>
  );

  if (loading) {
    return <Loading fullScreen text="Loading promotions..." />;
  }

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.success }]}>
            {promotions.filter(p => p.can_claim).length}
          </Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.warning }]}>
            {pendingClaims.length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.primary }]}>
            {approvedClaims.reduce((sum, c) => sum + (c.claimed_value || c.value || 0), 0)}
          </Text>
          <Text style={styles.statLabel}>GC Claimed</Text>
        </View>
      </View>

      {/* Pending Claims Alert */}
      {pendingClaims.length > 0 && (
        <View style={styles.pendingAlert}>
          <Ionicons name="hourglass" size={20} color={Colors.warning} />
          <Text style={styles.pendingAlertText}>
            {pendingClaims.length} claim{pendingClaims.length > 1 ? 's' : ''} pending approval
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.tabActive]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
            Available ({promotions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'claims' && styles.tabActive]}
          onPress={() => setActiveTab('claims')}
        >
          <Text style={[styles.tabText, activeTab === 'claims' && styles.tabTextActive]}>
            My Claims ({claims.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'available' ? (
        <FlatList
          data={promotions}
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
              title="No Promotions Available"
              description="Check back later for new promotions from your clients"
            />
          }
        />
      ) : (
        <FlatList
          data={claims}
          keyExtractor={(item) => (item.claim_id || item.id)?.toString() || ''}
          renderItem={renderClaim}
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
              icon="receipt-outline"
              title="No Claims Yet"
              description="Claim promotions to see them here"
              actionLabel="View Promotions"
              onAction={() => setActiveTab('available')}
            />
          }
        />
      )}

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDetailsModal(false);
          setSelectedPromotion(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Promotion Details</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDetailsModal(false);
                  setSelectedPromotion(null);
                }}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedPromotion && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsTitle}>{selectedPromotion.title}</Text>
                  <Badge text="GC Bonus" variant="warning" size="sm" />
                </View>

                <Text style={styles.detailsDescription}>
                  {selectedPromotion.description}
                </Text>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailsGridItem}>
                    <Text style={styles.detailsLabel}>Client</Text>
                    <Text style={styles.detailsValue}>
                      {selectedPromotion.client_company || selectedPromotion.client_name}
                    </Text>
                  </View>
                  <View style={styles.detailsGridItem}>
                    <Text style={styles.detailsLabel}>Value</Text>
                    <Text style={[styles.detailsValue, { color: Colors.primary }]}>
                      {selectedPromotion.value} GC
                    </Text>
                  </View>
                  <View style={styles.detailsGridItem}>
                    <Text style={styles.detailsLabel}>Min Level</Text>
                    <Text style={styles.detailsValue}>
                      Level {selectedPromotion.min_player_level}
                    </Text>
                  </View>
                  <View style={styles.detailsGridItem}>
                    <Text style={styles.detailsLabel}>Wagering</Text>
                    <Text style={styles.detailsValue}>
                      {selectedPromotion.wagering_requirement}x
                    </Text>
                  </View>
                  <View style={styles.detailsGridItem}>
                    <Text style={styles.detailsLabel}>Start Date</Text>
                    <Text style={styles.detailsValue}>
                      {new Date(selectedPromotion.start_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailsGridItem}>
                    <Text style={styles.detailsLabel}>End Date</Text>
                    <Text style={styles.detailsValue}>
                      {new Date(selectedPromotion.end_date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {selectedPromotion.terms && (
                  <View style={styles.termsSection}>
                    <Text style={styles.termsTitle}>Terms & Conditions</Text>
                    <Text style={styles.termsText}>{selectedPromotion.terms}</Text>
                  </View>
                )}

                {selectedPromotion.can_claim && !selectedPromotion.already_claimed && (
                  <View style={styles.noteSection}>
                    <Ionicons name="information-circle" size={20} color={Colors.info} />
                    <Text style={styles.noteText}>
                      When you claim this promotion, a request will be sent to the client for approval.
                    </Text>
                  </View>
                )}

                {selectedPromotion.can_claim && !selectedPromotion.already_claimed ? (
                  <Button
                    title="Request Claim"
                    onPress={() => handleClaimPromotion(selectedPromotion)}
                    loading={claiming === selectedPromotion.id}
                    style={styles.modalClaimButton}
                    icon={<Ionicons name="gift" size={18} color={Colors.background} />}
                  />
                ) : selectedPromotion.already_claimed ? (
                  <View style={styles.alreadyClaimedSection}>
                    <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
                    <Text style={styles.alreadyClaimedTitle}>Already Claimed</Text>
                    <Text style={styles.alreadyClaimedText}>
                      You have already claimed this promotion
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
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
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
    paddingVertical: Spacing.md,
    alignItems: 'center',
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
  },
  promotionCard: {
    marginBottom: Spacing.md,
  },
  promotionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  promotionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promotionInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  promotionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  clientName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  valueLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  valueAmount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  promotionDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  promotionMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
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
  promotionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  detailsButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  detailsButtonText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  claimButton: {
    minWidth: 100,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  claimedText: {
    fontSize: FontSize.sm,
    color: Colors.success,
    fontWeight: FontWeight.medium,
  },
  claimCard: {
    marginBottom: Spacing.sm,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  claimInfo: {
    flex: 1,
  },
  claimTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  claimClient: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  claimDetails: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  claimDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  claimDetailText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  wageringSection: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
  },
  wageringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  wageringLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  wageringValue: {
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
    maxHeight: '80%',
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
  detailsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  detailsTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  detailsDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  detailsGridItem: {
    width: '50%',
    marginBottom: Spacing.md,
  },
  detailsLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  detailsValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  termsSection: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  termsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  termsText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
  modalClaimButton: {
    marginTop: Spacing.sm,
  },
  alreadyClaimedSection: {
    alignItems: 'center',
    backgroundColor: Colors.success + '20',
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  alreadyClaimedTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.success,
    marginTop: Spacing.sm,
  },
  alreadyClaimedText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
