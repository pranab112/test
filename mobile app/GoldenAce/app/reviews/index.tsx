import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { reviewsApi } from '../../src/api/reviews.api';
import { friendsApi } from '../../src/api/friends.api';
import { Card, Avatar, Badge, Button, Loading, EmptyState } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { Review, Friend } from '../../src/types';

type TabType = 'received' | 'given';

export default function ReviewsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [receivedReviews, setReceivedReviews] = useState<Review[]>([]);
  const [givenReviews, setGivenReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Write review modal
  const [showWriteReviewModal, setShowWriteReviewModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [received, given, friendsData] = await Promise.all([
        reviewsApi.getMyReviews(),
        reviewsApi.getGivenReviews(),
        friendsApi.getFriends(),
      ]);
      setReceivedReviews(received);
      setGivenReviews(given);
      setFriends(friendsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
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

  const handleSubmitReview = async () => {
    if (!selectedFriend) {
      Alert.alert('Error', 'Please select a player to review');
      return;
    }
    if (!reviewTitle.trim()) {
      Alert.alert('Error', 'Please enter a review title');
      return;
    }

    setSubmitting(true);
    try {
      await reviewsApi.createReview({
        reviewee_id: selectedFriend.id,
        rating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim() || undefined,
      });
      Alert.alert('Success', 'Review submitted successfully!');
      setShowWriteReviewModal(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedFriend(null);
    setRating(5);
    setReviewTitle('');
    setReviewComment('');
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number, size: number = 16, onPress?: (r: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && onPress(star)}
            disabled={!onPress}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={size}
              color={star <= rating ? Colors.warning : Colors.textMuted}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge text="Approved" variant="success" size="sm" />;
      case 'pending':
        return <Badge text="Pending" variant="warning" size="sm" />;
      case 'rejected':
        return <Badge text="Rejected" variant="error" size="sm" />;
      default:
        return <Badge text={status} variant="default" size="sm" />;
    }
  };

  const renderReview = ({ item }: { item: Review }) => {
    const isReceived = activeTab === 'received';
    const person = isReceived ? item.reviewer : item.reviewee;

    return (
      <Card style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <TouchableOpacity
            style={styles.reviewerInfo}
            onPress={() => router.push(`/profile/${person.id}`)}
          >
            <Avatar
              source={person.profile_picture}
              name={person.full_name || person.username}
              size="md"
            />
            <View style={styles.reviewerDetails}>
              <Text style={styles.reviewerName}>
                {person.full_name || person.username}
              </Text>
              <Text style={styles.reviewerUsername}>@{person.username}</Text>
            </View>
          </TouchableOpacity>
          {getStatusBadge(item.status)}
        </View>

        <View style={styles.reviewContent}>
          <View style={styles.ratingRow}>
            {renderStars(item.rating)}
            <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
          </View>
          <Text style={styles.reviewTitle}>{item.title}</Text>
          {item.comment && (
            <Text style={styles.reviewComment}>{item.comment}</Text>
          )}
        </View>
      </Card>
    );
  };

  const renderFriendOption = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={[
        styles.friendOption,
        selectedFriend?.id === item.id && styles.friendOptionSelected,
      ]}
      onPress={() => setSelectedFriend(item)}
    >
      <Avatar
        source={item.profile_picture}
        name={item.full_name || item.username}
        size="sm"
      />
      <View style={styles.friendOptionInfo}>
        <Text style={styles.friendOptionName}>
          {item.full_name || item.username}
        </Text>
        <Text style={styles.friendOptionUsername}>@{item.username}</Text>
      </View>
      {selectedFriend?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading fullScreen text="Loading reviews..." />;
  }

  const currentReviews = activeTab === 'received' ? receivedReviews : givenReviews;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitle: 'Reviews',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowWriteReviewModal(true)}>
              <Ionicons name="create" size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'received' && styles.tabActive]}
            onPress={() => setActiveTab('received')}
          >
            <Ionicons
              name="star"
              size={18}
              color={activeTab === 'received' ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
              Received ({receivedReviews.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'given' && styles.tabActive]}
            onPress={() => setActiveTab('given')}
          >
            <Ionicons
              name="create"
              size={18}
              color={activeTab === 'given' ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'given' && styles.tabTextActive]}>
              Given ({givenReviews.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reviews List */}
        <FlatList
          data={currentReviews}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReview}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="star-outline"
              title={activeTab === 'received' ? 'No Reviews Received' : 'No Reviews Given'}
              description={
                activeTab === 'received'
                  ? "You haven't received any reviews yet"
                  : "You haven't written any reviews yet"
              }
              actionLabel={activeTab === 'given' ? 'Write a Review' : undefined}
              onAction={activeTab === 'given' ? () => setShowWriteReviewModal(true) : undefined}
            />
          }
        />

        {/* Write Review Modal */}
        <Modal
          visible={showWriteReviewModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowWriteReviewModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Write a Review</Text>
                <TouchableOpacity onPress={() => setShowWriteReviewModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              {/* Select Friend */}
              <Text style={styles.inputLabel}>Select Player to Review</Text>
              <FlatList
                data={friends}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderFriendOption}
                style={styles.friendsList}
                ListEmptyComponent={
                  <Text style={styles.emptyFriendsText}>No friends to review</Text>
                }
              />

              {selectedFriend && (
                <>
                  {/* Rating */}
                  <Text style={styles.inputLabel}>Rating</Text>
                  <View style={styles.ratingSelector}>
                    {renderStars(rating, 32, setRating)}
                    <Text style={styles.ratingText}>{rating}/5</Text>
                  </View>

                  {/* Title */}
                  <Text style={styles.inputLabel}>Title *</Text>
                  <TextInput
                    style={styles.input}
                    value={reviewTitle}
                    onChangeText={setReviewTitle}
                    placeholder="Summary of your experience"
                    placeholderTextColor={Colors.textMuted}
                    maxLength={100}
                  />

                  {/* Comment */}
                  <Text style={styles.inputLabel}>Comment (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    placeholder="Share more details about your experience..."
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={500}
                  />

                  <Button
                    title={submitting ? 'Submitting...' : 'Submit Review'}
                    onPress={handleSubmitReview}
                    loading={submitting}
                    style={styles.submitButton}
                  />
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    marginRight: Spacing.sm,
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
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  list: {
    padding: Spacing.md,
  },
  reviewCard: {
    marginBottom: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerDetails: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  reviewerName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  reviewerUsername: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  reviewContent: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  friendsList: {
    maxHeight: 150,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  friendOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  friendOptionSelected: {
    backgroundColor: Colors.primary + '10',
  },
  friendOptionInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  friendOptionName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  friendOptionUsername: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  emptyFriendsText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  ratingSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  ratingText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.warning,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: Spacing.lg,
  },
});
