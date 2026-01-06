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
import { gamesApi } from '../../src/api/games.api';
import { offersApi } from '../../src/api/offers.api';
import { Card, Avatar, Badge, Loading } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Friend, ClientGame, OfferClaim } from '../../src/types';

interface DashboardStats {
  totalPlayers: number;
  onlinePlayers: number;
  totalGames: number;
  pendingClaims: number;
}

export default function ClientDashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    onlinePlayers: 0,
    totalGames: 0,
    pendingClaims: 0,
  });
  const [recentPlayers, setRecentPlayers] = useState<Friend[]>([]);
  const [pendingClaims, setPendingClaims] = useState<OfferClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [friendsData, gamesData, claimsData] = await Promise.all([
        friendsApi.getFriends(),
        gamesApi.getClientGames(),
        offersApi.getPendingClaimsForClient(),
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
            name={user?.company_name || user?.username}
            size="lg"
          />
          <View style={styles.welcomeText}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.companyName}>{user?.company_name || user?.username}</Text>
          </View>
          <Badge text="Client" variant="gold" />
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
            <Card key={claim.id} style={styles.claimCard}>
              <View style={styles.claimHeader}>
                <Text style={styles.claimTitle}>{claim.offer_title || 'Offer'}</Text>
                <Badge text="Pending" variant="warning" size="sm" />
              </View>
              <View style={styles.claimInfo}>
                <Text style={styles.claimPlayer}>
                  Player: {claim.player_name || `#${claim.player_id}`}
                </Text>
                <Text style={styles.claimBonus}>
                  ${claim.bonus_amount.toFixed(2)}
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
});
