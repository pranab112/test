import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useChat } from '../../src/contexts/ChatContext';
import { friendsApi } from '../../src/api/friends.api';
import { gamesApi } from '../../src/api/games.api';
import { promotionsApi, PromotionClaim } from '../../src/api/promotions.api';
import { Card, Avatar, Badge, Loading } from '../../src/components/ui';
import AnnouncementTicker from '../../src/components/AnnouncementTicker';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Friend, ClientGame } from '../../src/types';

interface DashboardStats {
  totalPlayers: number;
  onlinePlayers: number;
  totalGames: number;
  pendingClaims: number;
}

export default function ClientDashboardScreen() {
  const { user } = useAuth();
  const { unreadCount, refreshUnreadCount } = useChat();
  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    onlinePlayers: 0,
    totalGames: 0,
    pendingClaims: 0,
  });
  const [recentPlayers, setRecentPlayers] = useState<Friend[]>([]);
  const [pendingClaims, setPendingClaims] = useState<PromotionClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [friendsData, gamesData, claimsData] = await Promise.all([
        friendsApi.getFriends(),
        gamesApi.getClientGames(),
        promotionsApi.getPendingApprovals(),
      ]);

      const players = friendsData.filter((f) => f.user_type === 'player');
      const onlineCount = players.filter((p) => p.is_online).length;

      setStats({
        totalPlayers: players.length,
        onlinePlayers: onlineCount,
        totalGames: gamesData.length,
        pendingClaims: claimsData.length,
      });

      setRecentPlayers(players.slice(0, 5));
      setPendingClaims(claimsData.slice(0, 3));
    } catch (error) {
      console.error('Error loading dashboard:', error);
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

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
      // Refresh unread count immediately and with delays
      refreshUnreadCount();
      const timer1 = setTimeout(() => refreshUnreadCount(), 300);
      const timer2 = setTimeout(() => refreshUnreadCount(), 800);
      const timer3 = setTimeout(() => refreshUnreadCount(), 1500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }, [refreshUnreadCount])
  );

  if (loading) {
    return <Loading fullScreen text="Loading dashboard..." />;
  }

  const StatCard = ({
    icon,
    label,
    value,
    color,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: number;
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Announcement Ticker - News style scrolling banner */}
      <AnnouncementTicker onPress={() => router.push('/(client)/broadcasts')} />

      <ScrollView
        style={styles.scrollView}
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
            name={user?.company_name || user?.username}
            size="lg"
          />
          <View style={styles.welcomeText}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.companyName}>{user?.company_name || user?.username}</Text>
          </View>
          <Badge text="Client" variant="emerald" />
        </View>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Ionicons name="wallet" size={20} color={Colors.success} />
            <Text style={styles.balanceValue}>{user?.credits || 0} GC</Text>
          </View>
          <View style={styles.balanceItem}>
            <Ionicons name="cash" size={20} color={Colors.warning} />
            <Text style={styles.balanceValue}>${((user?.credits || 0) / 100).toFixed(2)}</Text>
          </View>
        </View>
      </Card>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="people"
          label="Total Players"
          value={stats.totalPlayers}
          color={Colors.info}
          onPress={() => router.push('/(client)/players')}
        />
        <StatCard
          icon="radio-button-on"
          label="Online Now"
          value={stats.onlinePlayers}
          color={Colors.success}
        />
        <StatCard
          icon="game-controller"
          label="Active Games"
          value={stats.totalGames}
          color={Colors.primary}
          onPress={() => router.push('/(client)/games')}
        />
        <StatCard
          icon="gift"
          label="Pending Claims"
          value={stats.pendingClaims}
          color={Colors.warning}
          onPress={() => router.push('/(client)/claims')}
        />
      </View>

      {/* Pending Claims */}
      {pendingClaims.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Claims</Text>
            <TouchableOpacity onPress={() => router.push('/(client)/claims')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {pendingClaims.map((claim) => (
            <Card key={claim.claim_id} style={styles.claimCard}>
              <View style={styles.claimHeader}>
                <Text style={styles.claimTitle}>{claim.promotion_title || 'Promotion'}</Text>
                <Badge text="Pending" variant="warning" size="sm" />
              </View>
              <View style={styles.claimInfo}>
                <Text style={styles.claimPlayer}>
                  Player: {claim.player_username || claim.player_name || `#${claim.player_id}`}
                </Text>
                <Text style={styles.claimBonus}>
                  {claim.claimed_value || claim.value || 0} GC
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Recent Players */}
      {recentPlayers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Players</Text>
            <TouchableOpacity onPress={() => router.push('/(client)/players')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentPlayers.map((player) => (
            <TouchableOpacity
              key={player.id}
              style={styles.playerItem}
              onPress={() => router.push(`/chat/${player.id}`)}
            >
              <Avatar
                source={player.profile_picture}
                name={player.full_name || player.username}
                size="md"
                showOnlineStatus
                isOnline={player.is_online}
              />
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>
                  {player.full_name || player.username}
                </Text>
                <Text style={styles.playerUsername}>@{player.username}</Text>
              </View>
              <View style={styles.playerLevel}>
                <Ionicons name="star" size={14} color={Colors.primary} />
                <Text style={styles.levelText}>Lvl {player.player_level || 1}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Coming Soon Features */}
      <View style={styles.comingSoonSection}>
        <View style={styles.comingSoonHeader}>
          <View style={styles.comingSoonBadge}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.comingSoonTitle}>Coming Soon</Text>
            <Text style={styles.comingSoonSubtitle}>Exciting features in v2.0</Text>
          </View>
        </View>

        <View style={styles.featuresGrid}>
          {/* AI Chat */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.featureTitle}>AI Chat</Text>
            <Text style={styles.featureDesc}>24/7 AI support for players</Text>
            <View style={[styles.featureTag, { backgroundColor: '#8B5CF620' }]}>
              <Text style={[styles.featureTagText, { color: '#8B5CF6' }]}>v2.0</Text>
            </View>
          </View>

          {/* Auto Gamepoint */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="refresh-circle" size={24} color="#10B981" />
            </View>
            <Text style={styles.featureTitle}>Auto Loadout</Text>
            <Text style={styles.featureDesc}>Auto gamepoint on deposit</Text>
            <View style={[styles.featureTag, { backgroundColor: '#10B98120' }]}>
              <Text style={[styles.featureTagText, { color: '#10B981' }]}>v2.0</Text>
            </View>
          </View>

          {/* Payment Verification */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.featureTitle}>Pay Verify</Text>
            <Text style={styles.featureDesc}>Auto payment validation</Text>
            <View style={[styles.featureTag, { backgroundColor: '#3B82F620' }]}>
              <Text style={[styles.featureTagText, { color: '#3B82F6' }]}>v2.0</Text>
            </View>
          </View>

          {/* SMS Notification */}
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#F5990020' }]}>
              <Ionicons name="chatbox" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.featureTitle}>SMS Alerts</Text>
            <Text style={styles.featureDesc}>Instant SMS notifications</Text>
            <View style={[styles.featureTag, { backgroundColor: '#F5990020' }]}>
              <Text style={[styles.featureTagText, { color: '#F59E0B' }]}>v2.0</Text>
            </View>
          </View>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
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
  },
  welcomeText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  greeting: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  companyName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  balanceRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.lg,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  balanceValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
    marginBottom: Spacing.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    margin: '1%',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
  claimInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  claimPlayer: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  claimBonus: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  playerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  playerName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  playerUsername: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  playerLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  levelText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  // Coming Soon Styles
  comingSoonSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#8B5CF640',
  },
  comingSoonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  comingSoonBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#8B5CF6',
  },
  comingSoonSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  featureCard: {
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    margin: '1%',
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  featureTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  featureTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  featureTagText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
