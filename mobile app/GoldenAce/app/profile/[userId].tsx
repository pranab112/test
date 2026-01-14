import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { friendsApi } from '../../src/api/friends.api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Card, Avatar, Badge, Button, Loading } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Friend } from '../../src/types';

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  const loadProfile = async () => {
    if (!userId) return;

    try {
      // Get friends list to find the user
      const friends = await friendsApi.getFriends();
      const friendProfile = friends.find((f) => f.id === parseInt(userId));

      if (friendProfile) {
        setProfile(friendProfile);
        setIsFriend(true);
      } else {
        // Try searching for the user
        const searchResults = await friendsApi.searchUsers(userId);
        const foundUser = searchResults.find((u) => u.id === parseInt(userId));
        if (foundUser) {
          setProfile(foundUser as Friend);
        }
      }

      // Check for pending friend requests
      const pendingRequests = await friendsApi.getPendingRequests();
      const hasPending = pendingRequests.some(
        (r) => r.receiver_id === parseInt(userId) || r.requester_id === parseInt(userId)
      );
      setRequestPending(hasPending);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const handleSendFriendRequest = async () => {
    if (!userId) return;

    setSendingRequest(true);
    try {
      await friendsApi.sendFriendRequest(parseInt(userId));
      Alert.alert('Success', 'Friend request sent!');
      setRequestPending(true);
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to send friend request');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!userId) return;

    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await friendsApi.removeFriend(parseInt(userId));
              Alert.alert('Success', 'Friend removed');
              setIsFriend(false);
            } catch (error: any) {
              Alert.alert('Error', error?.detail || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return <Loading fullScreen text="Loading profile..." />;
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.errorText}>User not found</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="outline" />
      </View>
    );
  }

  const isOwnProfile = profile.id === user?.id;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitle: profile.full_name || profile.username,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Avatar
            source={profile.profile_picture}
            name={profile.full_name || profile.username}
            size="xl"
            showOnlineStatus
            isOnline={profile.is_online}
          />
          <Text style={styles.name}>{profile.full_name || profile.username}</Text>
          <Text style={styles.username}>@{profile.username}</Text>

          <View style={styles.badgeContainer}>
            <Badge
              text={profile.user_type}
              variant={profile.user_type === 'client' ? 'emerald' : 'default'}
              size="sm"
            />
            {profile.is_online && (
              <Badge text="Online" variant="success" size="sm" />
            )}
          </View>
        </View>

        {/* Stats */}
        {profile.user_type === 'player' && (
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={24} color={Colors.primary} />
                <Text style={styles.statValue}>Level {profile.player_level || 1}</Text>
                <Text style={styles.statLabel}>Player Level</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="calendar" size={24} color={Colors.info} />
                <Text style={styles.statValue}>{formatDate(profile.created_at)}</Text>
                <Text style={styles.statLabel}>Member Since</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Actions */}
        {!isOwnProfile && (
          <View style={styles.actions}>
            {isFriend ? (
              <>
                <Button
                  title="Message"
                  onPress={() => router.push(`/chat/${profile.id}`)}
                  icon={<Ionicons name="chatbubble" size={18} color={Colors.background} />}
                  style={styles.actionButton}
                />
                <Button
                  title="Remove Friend"
                  onPress={handleRemoveFriend}
                  variant="outline"
                  icon={<Ionicons name="person-remove" size={18} color={Colors.error} />}
                  style={[styles.actionButton, styles.removeButton]}
                  textStyle={{ color: Colors.error }}
                />
              </>
            ) : requestPending ? (
              <Button
                title="Request Pending"
                onPress={() => {}}
                disabled
                variant="outline"
                icon={<Ionicons name="time" size={18} color={Colors.textMuted} />}
                style={styles.actionButton}
              />
            ) : (
              <Button
                title="Add Friend"
                onPress={handleSendFriendRequest}
                loading={sendingRequest}
                icon={<Ionicons name="person-add" size={18} color={Colors.background} />}
                style={styles.actionButton}
              />
            )}
          </View>
        )}

        {/* Info Section */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>About</Text>

          {profile.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{profile.email}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.infoText}>
              {profile.is_online ? 'Currently online' : 'Last seen recently'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.infoText}>Joined {formatDate(profile.created_at)}</Text>
          </View>
        </Card>
      </ScrollView>
    </>
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
  backButton: {
    marginRight: Spacing.sm,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  username: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statsCard: {
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.border,
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  actions: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
  removeButton: {
    borderColor: Colors.error,
  },
  infoCard: {
    marginBottom: Spacing.md,
  },
  infoTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
});
