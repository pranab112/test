import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { promotionsApi, PromotionClaim } from '../../src/api/promotions.api';
import { Card, Badge, Loading, EmptyState, Button, Avatar } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';

type TabType = 'pending' | 'all';

export default function ClientClaimsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [pendingClaims, setPendingClaims] = useState<PromotionClaim[]>([]);
  const [allClaims, setAllClaims] = useState<PromotionClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      // Get pending approval claims from promotions API
      const pending = await promotionsApi.getPendingApprovals();
      setPendingClaims(pending);
      // For all claims, we use the same list but include all statuses
      // The promotions API doesn't have a separate "all claims" endpoint for clients
      // So we'll just show pending claims in the "All" tab for now
      setAllClaims(pending);
    } catch (error) {
      console.error('Error loading claims:', error);
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

  const handleProcessClaim = async (claimId: number, action: 'approve' | 'reject') => {
    const actionText = action === 'approve' ? 'approve' : 'reject';

    Alert.alert(
      `${action === 'approve' ? 'Approve' : 'Reject'} Claim`,
      `Are you sure you want to ${actionText} this claim?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            setProcessingId(claimId);
            try {
              if (action === 'approve') {
                await promotionsApi.approveClaim(claimId);
              } else {
                await promotionsApi.rejectClaim(claimId);
              }
              Alert.alert('Success', `Claim ${actionText}d successfully`);
              await loadData();
            } catch (error: any) {
              Alert.alert('Error', error?.detail || `Failed to ${actionText} claim`);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'approved':
      case 'claimed':
      case 'used':
        return 'success';
      case 'pending':
      case 'pending_approval':
        return 'warning';
      case 'rejected':
      case 'expired':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderPendingClaim = ({ item }: { item: PromotionClaim }) => (
    <Card style={styles.claimCard}>
      <View style={styles.claimHeader}>
        <View style={styles.offerInfo}>
          <Text style={styles.offerTitle}>{item.promotion_title || 'Promotion'}</Text>
          <Badge text="Pending" variant="warning" size="sm" />
        </View>
        <Text style={styles.bonusAmount}>{item.claimed_value || item.value || 0} GC</Text>
      </View>

      <View style={styles.playerRow}>
        <Avatar
          name={item.player_username || item.player_name || `Player ${item.player_id}`}
          size="sm"
        />
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>
            {item.player_username || item.player_name || `Player #${item.player_id}`}
          </Text>
          <Text style={styles.claimDate}>
            Claimed: {formatDate(item.claimed_at)}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Button
          title="Reject"
          onPress={() => handleProcessClaim(item.claim_id, 'reject')}
          variant="outline"
          size="sm"
          style={styles.rejectButton}
          textStyle={{ color: Colors.error }}
          loading={processingId === item.claim_id}
        />
        <Button
          title="Approve"
          onPress={() => handleProcessClaim(item.claim_id, 'approve')}
          size="sm"
          style={styles.approveButton}
          icon={<Ionicons name="checkmark" size={16} color={Colors.background} />}
          loading={processingId === item.claim_id}
        />
      </View>
    </Card>
  );

  const renderAllClaim = ({ item }: { item: PromotionClaim }) => (
    <Card style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.historyInfo}>
          <Text style={styles.historyTitle}>{item.promotion_title || 'Promotion'}</Text>
          <Text style={styles.historyPlayer}>
            {item.player_username || item.player_name || `Player #${item.player_id}`}
          </Text>
        </View>
        <View style={styles.historyRight}>
          <Badge text={item.status.replace('_', ' ')} variant={getStatusVariant(item.status)} size="sm" />
          <Text style={styles.historyAmount}>{item.claimed_value || item.value || 0} GC</Text>
        </View>
      </View>
      <View style={styles.historyDates}>
        <Text style={styles.dateText}>
          Claimed: {formatDate(item.claimed_at)}
        </Text>
      </View>
    </Card>
  );

  if (loading) {
    return <Loading fullScreen text="Loading claims..." />;
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text
            style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}
          >
            Pending ({pendingClaims.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text
            style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}
          >
            All Claims ({allClaims.length})
          </Text>
        </TouchableOpacity>
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
          data={allClaims}
          keyExtractor={(item) => item.claim_id.toString()}
          renderItem={renderAllClaim}
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
              description="Player claims will appear here"
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
  claimCard: {
    marginBottom: Spacing.md,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  offerInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  offerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  bonusAmount: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
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
  verificationSection: {
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
  },
  verificationLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  verificationData: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  actionButtons: {
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
  historyCard: {
    marginBottom: Spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  historyPlayer: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  historyAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  historyDates: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dateText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
