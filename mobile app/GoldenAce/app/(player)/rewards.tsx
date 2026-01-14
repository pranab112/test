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
import { Ionicons } from '@expo/vector-icons';
import { offersApi } from '../../src/api/offers.api';
import { friendsApi } from '../../src/api/friends.api';
import { Card, Badge, Loading, EmptyState, Button } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { PlatformOffer, OfferClaim, Friend } from '../../src/types';

type TabType = 'available' | 'claimed';

export default function PlayerRewardsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [offers, setOffers] = useState<PlatformOffer[]>([]);
  const [claims, setClaims] = useState<OfferClaim[]>([]);
  const [clients, setClients] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<PlatformOffer | null>(null);

  const loadData = async () => {
    try {
      const [offersData, claimsData, friendsData] = await Promise.all([
        offersApi.getAvailableOffers(),
        offersApi.getMyClaims(),
        friendsApi.getFriends(),
      ]);
      setOffers(offersData);
      setClaims(claimsData);
      setClients(friendsData.filter((f) => f.user_type === 'client'));
    } catch (error) {
      console.error('Error loading rewards:', error);
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

  const getOfferIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'email_verification':
        return 'mail';
      case 'profile_completion':
        return 'person';
      case 'first_deposit':
        return 'wallet';
      case 'referral':
        return 'people';
      case 'loyalty':
        return 'star';
      case 'special_event':
        return 'gift';
      default:
        return 'pricetag';
    }
  };

  const handleClaimOffer = async (clientId: number) => {
    if (!selectedOffer) return;

    try {
      await offersApi.claimOffer({
        offer_id: selectedOffer.id,
        client_id: clientId,
      });
      Alert.alert('Success', 'Offer claimed successfully! Waiting for client approval.');
      setClaimModalVisible(false);
      setSelectedOffer(null);
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to claim offer');
    }
  };

  const openClaimModal = (offer: PlatformOffer) => {
    if (clients.length === 0) {
      Alert.alert(
        'No Clients',
        'You need to be connected with a client to claim offers. Add a client as a friend first.'
      );
      return;
    }
    setSelectedOffer(offer);
    setClaimModalVisible(true);
  };

  const getClaimStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const renderOffer = ({ item }: { item: PlatformOffer }) => (
    <Card style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <View style={styles.offerIconContainer}>
          <Ionicons
            name={getOfferIcon(item.offer_type)}
            size={24}
            color={Colors.primary}
          />
        </View>
        <View style={styles.offerInfo}>
          <Text style={styles.offerTitle}>{item.title}</Text>
          <Badge
            text={item.offer_type.replace('_', ' ')}
            variant="emerald"
            size="sm"
          />
        </View>
        <View style={styles.bonusContainer}>
          <Text style={styles.bonusLabel}>Bonus</Text>
          <Text style={styles.bonusAmount}>{item.bonus_amount} GC</Text>
        </View>
      </View>
      <Text style={styles.offerDescription}>{item.description}</Text>
      {item.requirement_description && (
        <Text style={styles.requirement}>
          <Ionicons name="information-circle" size={14} color={Colors.textSecondary} />
          {' '}{item.requirement_description}
        </Text>
      )}
      <Button
        title="Claim Offer"
        onPress={() => openClaimModal(item)}
        style={styles.claimButton}
        icon={<Ionicons name="gift" size={18} color={Colors.background} />}
      />
    </Card>
  );

  const renderClaim = ({ item }: { item: OfferClaim }) => (
    <Card style={styles.claimCard}>
      <View style={styles.claimHeader}>
        <Text style={styles.claimTitle}>{item.offer_title || 'Offer'}</Text>
        <Badge
          text={item.status}
          variant={getClaimStatusColor(item.status)}
          size="sm"
        />
      </View>
      <View style={styles.claimDetails}>
        <View style={styles.claimDetail}>
          <Ionicons name="business" size={16} color={Colors.textSecondary} />
          <Text style={styles.claimDetailText}>
            Client: {item.client_name || `#${item.client_id}`}
          </Text>
        </View>
        <View style={styles.claimDetail}>
          <Ionicons name="wallet" size={16} color={Colors.primary} />
          <Text style={styles.claimDetailText}>
            Bonus: {item.bonus_amount} GC
          </Text>
        </View>
        <View style={styles.claimDetail}>
          <Ionicons name="time" size={16} color={Colors.textSecondary} />
          <Text style={styles.claimDetailText}>
            Claimed: {new Date(item.claimed_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </Card>
  );

  if (loading) {
    return <Loading fullScreen text="Loading rewards..." />;
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.tabActive]}
          onPress={() => setActiveTab('available')}
        >
          <Text
            style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}
          >
            Available ({offers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'claimed' && styles.tabActive]}
          onPress={() => setActiveTab('claimed')}
        >
          <Text
            style={[styles.tabText, activeTab === 'claimed' && styles.tabTextActive]}
          >
            My Claims ({claims.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'available' ? (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOffer}
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
              title="No Offers Available"
              description="Check back later for new offers"
            />
          }
        />
      ) : (
        <FlatList
          data={claims}
          keyExtractor={(item) => item.id.toString()}
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
              description="Claim offers to see them here"
              actionLabel="View Offers"
              onAction={() => setActiveTab('available')}
            />
          }
        />
      )}

      {/* Claim Modal */}
      <Modal
        visible={claimModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setClaimModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => setClaimModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              Choose a client to claim this offer through:
            </Text>
            <FlatList
              data={clients}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.clientOption}
                  onPress={() => handleClaimOffer(item.id)}
                >
                  <Ionicons name="business" size={20} color={Colors.primary} />
                  <Text style={styles.clientName}>{item.username}</Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            />
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
  offerCard: {
    marginBottom: Spacing.md,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  offerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  offerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  bonusContainer: {
    alignItems: 'flex-end',
  },
  bonusLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  bonusAmount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  offerDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  requirement: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  claimButton: {
    marginTop: Spacing.sm,
  },
  claimCard: {
    marginBottom: Spacing.sm,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  claimTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  claimDetails: {
    gap: Spacing.xs,
  },
  claimDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  claimDetailText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
    maxHeight: '60%',
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
  modalDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  clientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  clientName: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
});
