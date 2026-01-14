import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { friendsApi } from '../../src/api/friends.api';
import { reviewsApi } from '../../src/api/reviews.api';
import { reportsApi } from '../../src/api/reports.api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Card, Avatar, Badge, Button, Loading } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Friend, Review, ReviewStats, Report } from '../../src/types';

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Reports state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportEvidence, setReportEvidence] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

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

      // Load reviews and stats
      try {
        const [reviewsData, statsData, canReviewData] = await Promise.all([
          reviewsApi.getUserReviews(parseInt(userId)),
          reviewsApi.getReviewStats(parseInt(userId)),
          reviewsApi.canReview(parseInt(userId)),
        ]);
        setReviews(reviewsData.reviews || []);
        setReviewStats(statsData);
        setCanReview(canReviewData.can_review);
      } catch (err) {
        console.error('Error loading reviews:', err);
      }
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

  const handleSubmitReview = async () => {
    if (!userId || !reviewTitle.trim()) {
      Alert.alert('Error', 'Please provide a title for your review');
      return;
    }

    setSubmittingReview(true);
    try {
      await reviewsApi.createReview({
        reviewee_id: parseInt(userId),
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim() || undefined,
      });
      Alert.alert('Success', 'Review submitted successfully!');
      setShowReviewModal(false);
      setReviewRating(5);
      setReviewTitle('');
      setReviewComment('');
      // Reload reviews
      const [reviewsData, statsData] = await Promise.all([
        reviewsApi.getUserReviews(parseInt(userId)),
        reviewsApi.getReviewStats(parseInt(userId)),
      ]);
      setReviews(reviewsData.reviews || []);
      setReviewStats(statsData);
      setCanReview(false);
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!userId || !reportReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the report');
      return;
    }

    setSubmittingReport(true);
    try {
      await reportsApi.createReport({
        reported_user_id: parseInt(userId),
        reason: reportReason.trim(),
        evidence: reportEvidence.trim() || undefined,
      });
      Alert.alert('Success', 'Report submitted successfully. Our team will review it.');
      setShowReportModal(false);
      setReportReason('');
      setReportEvidence('');
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => interactive && setReviewRating(star)}
            disabled={!interactive}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={interactive ? 32 : 16}
              color={Colors.warning}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
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

        {/* Review/Report Actions */}
        {!isOwnProfile && (
          <View style={styles.reviewReportActions}>
            {canReview && (
              <Button
                title="Write Review"
                onPress={() => setShowReviewModal(true)}
                variant="outline"
                icon={<Ionicons name="star" size={18} color={Colors.primary} />}
                style={styles.reviewReportButton}
              />
            )}
            <Button
              title="Report User"
              onPress={() => setShowReportModal(true)}
              variant="outline"
              icon={<Ionicons name="flag" size={18} color={Colors.error} />}
              style={[styles.reviewReportButton, styles.reportButton]}
              textStyle={{ color: Colors.error }}
            />
          </View>
        )}

        {/* Reviews Section */}
        <Card style={styles.reviewsCard}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {reviewStats && (
              <View style={styles.ratingOverview}>
                <Ionicons name="star" size={20} color={Colors.warning} />
                <Text style={styles.avgRating}>
                  {reviewStats.average_rating?.toFixed(1) || '0.0'}
                </Text>
                <Text style={styles.totalReviews}>
                  ({reviewStats.total_reviews} reviews)
                </Text>
              </View>
            )}
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyReviews}>
              <Ionicons name="star-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyReviewsText}>No reviews yet</Text>
            </View>
          ) : (
            reviews.slice(0, 5).map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <Avatar
                      source={review.reviewer?.profile_picture}
                      name={review.reviewer?.full_name || review.reviewer?.username}
                      size="sm"
                    />
                    <View style={styles.reviewerDetails}>
                      <Text style={styles.reviewerName}>
                        {review.reviewer?.full_name || review.reviewer?.username}
                      </Text>
                      <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                    </View>
                  </View>
                  {renderStars(review.rating)}
                </View>
                <Text style={styles.reviewTitle}>{review.title}</Text>
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Rating</Text>
            {renderStars(reviewRating, true)}

            <Text style={styles.modalLabel}>Title</Text>
            <TextInput
              style={styles.modalInput}
              value={reviewTitle}
              onChangeText={setReviewTitle}
              placeholder="Summary of your experience"
              placeholderTextColor={Colors.textMuted}
              maxLength={100}
            />

            <Text style={styles.modalLabel}>Comment (Optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Share more details about your experience..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <Button
              title="Submit Review"
              onPress={handleSubmitReview}
              loading={submittingReview}
              style={styles.submitButton}
            />
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report User</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Reason</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="Describe why you are reporting this user..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <Text style={styles.modalLabel}>Evidence (Optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={reportEvidence}
              onChangeText={setReportEvidence}
              placeholder="Provide any evidence or additional details..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <Button
              title="Submit Report"
              onPress={handleSubmitReport}
              loading={submittingReport}
              style={[styles.submitButton, styles.reportSubmitButton]}
            />
          </View>
        </View>
      </Modal>
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
  // Review/Report actions
  reviewReportActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  reviewReportButton: {
    flex: 1,
  },
  reportButton: {
    borderColor: Colors.error,
  },
  // Reviews section
  reviewsCard: {
    marginBottom: Spacing.md,
  },
  reviewsHeader: {
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
  ratingOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  avgRating: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  totalReviews: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyReviewsText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  reviewItem: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reviewerDetails: {
    gap: 2,
  },
  reviewerName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  reviewDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  reviewComment: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  modalInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: Spacing.lg,
  },
  reportSubmitButton: {
    backgroundColor: Colors.error,
  },
});
