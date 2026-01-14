import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { friendsApi } from '../../src/api/friends.api';
import { offersApi } from '../../src/api/offers.api';
import { Card, Avatar, Badge, Loading } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Friend, PlatformOffer } from '../../src/types';

export default function PlayerHomeScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [offers, setOffers] = useState<PlatformOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [friendsData, offersData] = await Promise.all([
        friendsApi.getFriends(),
        offersApi.getAvailableOffers(),
      ]);
      setFriends(friendsData.slice(0, 5));
      setOffers(offersData.slice(0, 3));
    } catch (error) {
      console.error('Error loading home data:', error);
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

  if (loading) {
    return <Loading fullScreen text="Loading..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Welcome Section */}
      <Card style={styles.welcomeCard}>
        <View style={styles.welcomeHeader}>
          <Avatar
            source={user?.profile_picture}
            name={user?.full_name || user?.username}
            size="lg"
          />
          <View style={styles.welcomeText}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.full_name || user?.username}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="star" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>Level {user?.player_level || 1}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="wallet" size={20} color={Colors.success} />
            <Text style={styles.statValue}>{user?.credits || 0} GC</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="cash" size={20} color={Colors.warning} />
            <Text style={styles.statValue}>${((user?.credits || 0) / 100).toFixed(2)}</Text>
          </View>
        </View>
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(player)/promotions')}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.primary + '20' }]}>
            <Ionicons name="megaphone" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.actionText}>Promos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(player)/rewards')}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.success + '20' }]}>
            <Ionicons name="gift" size={24} color={Colors.success} />
          </View>
          <Text style={styles.actionText}>Rewards</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(player)/friends')}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.info + '20' }]}>
            <Ionicons name="people" size={24} color={Colors.info} />
          </View>
          <Text style={styles.actionText}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(player)/messages')}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.warning + '20' }]}>
            <Ionicons name="chatbubbles" size={24} color={Colors.warning} />
          </View>
          <Text style={styles.actionText}>Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Available Offers */}
      {offers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Offers</Text>
            <TouchableOpacity onPress={() => router.push('/(player)/rewards')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {offers.map((offer) => (
            <Card key={offer.id} style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <Ionicons name="gift" size={24} color={Colors.primary} />
                <Badge
                  text={offer.offer_type.replace('_', ' ')}
                  variant="emerald"
                  size="sm"
                />
              </View>
              <Text style={styles.offerTitle}>{offer.title}</Text>
              <Text style={styles.offerDescription} numberOfLines={2}>
                {offer.description}
              </Text>
              <Text style={styles.offerBonus}>
                Bonus: {offer.bonus_amount} GC
              </Text>
            </Card>
          ))}
        </View>
      )}

      {/* Online Friends */}
      {friends.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friends</Text>
            <TouchableOpacity onPress={() => router.push('/(player)/friends')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {friends.map((friend) => (
              <TouchableOpacity
                key={friend.id}
                style={styles.friendItem}
                onPress={() => router.push(`/chat/${friend.id}`)}
              >
                <Avatar
                  source={friend.profile_picture}
                  name={friend.full_name || friend.username}
                  size="lg"
                  showOnlineStatus
                  isOnline={friend.is_online}
                />
                <Text style={styles.friendName} numberOfLines={1}>
                  {friend.username}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  welcomeCard: {
    marginBottom: Spacing.md,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  welcomeText: {
    marginLeft: Spacing.md,
  },
  greeting: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  actionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  seeAll: {
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  offerCard: {
    marginBottom: Spacing.sm,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  offerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  offerDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  offerBonus: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  friendItem: {
    alignItems: 'center',
    marginRight: Spacing.md,
    width: 70,
  },
  friendName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
