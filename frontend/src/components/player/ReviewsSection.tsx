import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { StatCard } from '@/components/common/StatCard';
import toast from 'react-hot-toast';
import { MdStar, MdStarBorder, MdEdit, MdDelete, MdRateReview, MdTrendingUp, MdRefresh } from 'react-icons/md';
import { reviewsApi, type Review } from '@/api/endpoints/reviews.api';
import { friendsApi, type Friend } from '@/api/endpoints/friends.api';

export function ReviewsSection() {
  const [activeTab, setActiveTab] = useState<'given' | 'received' | 'review_clients'>('given');
  const [showWriteReviewModal, setShowWriteReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Reviews data
  const [givenReviews, setGivenReviews] = useState<Review[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<Review[]>([]);
  const [givenTotal, setGivenTotal] = useState(0);
  const [receivedTotal, setReceivedTotal] = useState(0);
  const [avgRatingReceived, setAvgRatingReceived] = useState<number | null>(null);

  // Friends (clients) for review tab
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clientId: 0,
    clientUsername: '',
    rating: 5,
    title: '',
    comment: '',
  });

  // Load reviews on mount
  useEffect(() => {
    loadReviews();
  }, []);

  // Load friends when review_clients tab is selected
  useEffect(() => {
    if (activeTab === 'review_clients' && friends.length === 0) {
      loadFriends();
    }
  }, [activeTab]);

  const loadReviews = async () => {
    setLoadingReviews(true);
    try {
      const [givenResponse, receivedResponse] = await Promise.all([
        reviewsApi.getGivenReviews(),
        reviewsApi.getMyReviews(),
      ]);

      setGivenReviews(givenResponse.reviews);
      setGivenTotal(givenResponse.total_count);
      setReceivedReviews(receivedResponse.reviews);
      setReceivedTotal(receivedResponse.total_count);
      setAvgRatingReceived(receivedResponse.average_rating);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoadingReviews(false);
    }
  };

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const data = await friendsApi.getFriends();
      // Filter to show only clients (players review clients)
      const clients = data.filter(f => f.user_type === 'client');
      setFriends(clients);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const stats = {
    givenReviews: givenTotal,
    receivedReviews: receivedTotal,
    avgRatingGiven: givenReviews.length > 0
      ? givenReviews.reduce((sum, r) => sum + r.rating, 0) / givenReviews.length
      : 0,
    avgRatingReceived: avgRatingReceived || 0,
  };

  const handleWriteReview = async () => {
    if (!formData.clientId || !formData.comment) {
      toast.error('Please select a client and write a comment');
      return;
    }

    setLoading(true);
    try {
      const newReview = await reviewsApi.createReview({
        reviewee_id: formData.clientId,
        rating: formData.rating,
        title: formData.title || undefined,
        comment: formData.comment,
      });

      setGivenReviews(prev => [newReview, ...prev]);
      setGivenTotal(prev => prev + 1);
      toast.success('Review submitted successfully');
      setShowWriteReviewModal(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.detail || 'Failed to submit review');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditReview = async () => {
    if (!selectedReview) return;

    setLoading(true);
    try {
      const updatedReview = await reviewsApi.updateReview(selectedReview.id, {
        rating: formData.rating,
        title: formData.title || undefined,
        comment: formData.comment,
      });

      setGivenReviews(prev => prev.map(r => r.id === updatedReview.id ? updatedReview : r));
      toast.success('Review updated successfully');
      setShowEditModal(false);
      setSelectedReview(null);
      resetForm();
    } catch (error: any) {
      toast.error(error.detail || 'Failed to update review');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: number, revieweeName: string) => {
    if (!confirm(`Delete your review for ${revieweeName}?`)) {
      return;
    }

    try {
      await reviewsApi.deleteReview(reviewId);
      setGivenReviews(prev => prev.filter(r => r.id !== reviewId));
      setGivenTotal(prev => prev - 1);
      toast.success('Review deleted');
    } catch (error: any) {
      toast.error(error.detail || 'Failed to delete review');
      console.error(error);
    }
  };

  const openEditModal = (review: Review) => {
    setSelectedReview(review);
    setFormData({
      clientId: review.reviewee_id,
      clientUsername: review.reviewee?.username || '',
      rating: review.rating,
      title: review.title || '',
      comment: review.comment,
    });
    setShowEditModal(true);
  };

  const openWriteReviewForClient = async (friend: Friend) => {
    // Check if can review
    try {
      const canReview = await reviewsApi.canReviewUser(friend.id);
      if (!canReview.can_review) {
        toast.error(canReview.reason || 'Cannot review this client');
        return;
      }

      setFormData({
        clientId: friend.id,
        clientUsername: friend.username,
        rating: 5,
        title: '',
        comment: '',
      });
      setShowWriteReviewModal(true);
    } catch (error: any) {
      toast.error(error.detail || 'Failed to check review eligibility');
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: 0,
      clientUsername: '',
      rating: 5,
      title: '',
      comment: '',
    });
  };

  const renderStars = (rating: number, interactive: boolean = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRate && onRate(star)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
            title={interactive ? `Rate ${star} stars` : `${star} stars`}
          >
            {star <= rating ? (
              <MdStar className="text-gold-500" size={24} />
            ) : (
              <MdStarBorder className="text-gray-500" size={24} />
            )}
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const currentReviews = activeTab === 'given' ? givenReviews : activeTab === 'received' ? receivedReviews : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Reviews</h1>
          <p className="text-gray-400">Manage your reviews and reputation</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadReviews}
            className="bg-dark-300 hover:bg-dark-400 text-gold-500 p-3 rounded-lg transition-colors"
            title="Refresh"
          >
            <MdRefresh size={20} />
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowWriteReviewModal(true);
            }}
            className="bg-gold-600 hover:bg-gold-700 text-dark-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <MdRateReview size={20} />
            Write Review
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Reviews Given"
          value={stats.givenReviews}
          icon={<MdRateReview />}
          color="blue"
        />
        <StatCard
          title="Reviews Received"
          value={stats.receivedReviews}
          icon={<MdTrendingUp />}
          color="green"
        />
        <StatCard
          title="Avg Rating Given"
          value={stats.avgRatingGiven.toFixed(1)}
          icon={<MdStar />}
          color="gold"
        />
        <StatCard
          title="Avg Rating Received"
          value={stats.avgRatingReceived.toFixed(1)}
          icon={<MdStar />}
          color="purple"
        />
      </div>

      {/* Tab Interface */}
      <div className="flex gap-2 border-b border-gold-700">
        {[
          { key: 'given', label: 'Given' },
          { key: 'received', label: 'Received' },
          { key: 'review_clients', label: 'Review Clients' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-gold-500 border-b-2 border-gold-500'
                : 'text-gray-400 hover:text-gold-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loadingReviews ? (
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
            <div className="text-gold-500">Loading reviews...</div>
          </div>
        ) : activeTab === 'review_clients' ? (
          // Review Clients Tab
          <div>
            {loadingFriends ? (
              <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
                <div className="text-gold-500">Loading clients...</div>
              </div>
            ) : friends.length === 0 ? (
              <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
                <MdRateReview className="text-6xl text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No clients to review</p>
                <p className="text-sm text-gray-500">Add clients as friends first to review them</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-dark-200 border-2 border-gold-700 rounded-lg p-4 hover:shadow-gold transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar
                        name={friend.full_name || friend.username}
                        size="md"
                        online={friend.is_online}
                        src={friend.profile_picture}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate">{friend.username}</h3>
                        <p className="text-sm text-gray-400 truncate">{friend.full_name}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => openWriteReviewForClient(friend)}
                      variant="primary"
                      fullWidth
                      size="sm"
                    >
                      <MdRateReview className="mr-1" />
                      Write Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : currentReviews.length === 0 ? (
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
            <MdRateReview className="text-6xl text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No reviews found</p>
          </div>
        ) : (
          // Reviews List
          currentReviews.map((review) => {
            const isGiven = activeTab === 'given';
            const displayUser = isGiven ? review.reviewee : review.reviewer;
            const displayName = displayUser?.username || (isGiven ? 'Unknown Client' : 'Unknown User');

            return (
              <div
                key={review.id}
                className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6 hover:shadow-gold transition-all"
              >
                <div className="flex items-start gap-4">
                  <Avatar
                    name={displayUser?.full_name || displayName}
                    size="lg"
                    src={displayUser?.profile_picture}
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {review.title || 'Review'}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {isGiven ? 'To' : 'From'}:{' '}
                          <span className="text-gold-500">{displayName}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-white font-bold ml-2">{review.rating}/5</span>
                      </div>
                    </div>
                    <p className="text-gray-300 mb-3">{review.comment}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {formatDate(review.created_at)}
                      </p>
                      {isGiven && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(review)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            <MdEdit size={14} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review.id, displayName)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            <MdDelete size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Write Review Modal */}
      <Modal
        isOpen={showWriteReviewModal}
        onClose={() => {
          setShowWriteReviewModal(false);
          resetForm();
        }}
        title="Write a Review"
        size="lg"
      >
        <div className="space-y-4">
          {formData.clientUsername ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Client</label>
              <p className="text-white bg-dark-300 px-4 py-3 rounded-lg">{formData.clientUsername}</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select a Client</label>
              <select
                title="Select a client to review"
                value={formData.clientId}
                onChange={(e) => {
                  const selectedFriend = friends.find(f => f.id === Number(e.target.value));
                  setFormData({
                    ...formData,
                    clientId: Number(e.target.value),
                    clientUsername: selectedFriend?.username || '',
                  });
                }}
                className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value={0}>Select a client...</option>
                {friends.map((friend) => (
                  <option key={friend.id} value={friend.id}>
                    {friend.username} ({friend.full_name})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Rating</label>
            {renderStars(formData.rating, true, (rating) =>
              setFormData({ ...formData, rating })
            )}
          </div>
          <Input
            label="Review Title (Optional)"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter review title..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Comment *</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Share your experience..."
              rows={4}
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowWriteReviewModal(false);
                resetForm();
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button onClick={handleWriteReview} loading={loading} fullWidth>
              Submit Review
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Review Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedReview(null);
          resetForm();
        }}
        title="Edit Review"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Rating</label>
            {renderStars(formData.rating, true, (rating) =>
              setFormData({ ...formData, rating })
            )}
          </div>
          <Input
            label="Review Title (Optional)"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter review title..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Comment</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={4}
              placeholder="Update your review..."
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                setSelectedReview(null);
                resetForm();
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button onClick={handleEditReview} loading={loading} fullWidth>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
