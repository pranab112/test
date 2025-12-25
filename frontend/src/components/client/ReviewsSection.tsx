import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { StatCard } from '@/components/common/StatCard';
import toast from 'react-hot-toast';
import { MdStar, MdStarBorder, MdEdit, MdDelete, MdRateReview, MdTrendingUp } from 'react-icons/md';

interface Review {
  id: number;
  reviewerId: number;
  reviewerName: string;
  reviewerAvatar?: string;
  revieweeId: number;
  revieweeName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  type: 'given' | 'received';
}

export function ReviewsSection() {
  const [activeTab, setActiveTab] = useState<'given' | 'received' | 'review_clients'>('given');
  const [showWriteReviewModal, setShowWriteReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clientUsername: '',
    rating: 5,
    title: '',
    comment: '',
  });

  // TODO: Replace with API call
  const mockReviews: Review[] = [
    {
      id: 1,
      reviewerId: 1,
      reviewerName: 'You',
      revieweeId: 101,
      revieweeName: 'player_alex',
      rating: 5,
      title: 'Excellent player!',
      comment: 'Very professional and reliable. Highly recommended!',
      createdAt: '2025-12-20',
      type: 'given',
    },
    {
      id: 2,
      reviewerId: 1,
      reviewerName: 'You',
      revieweeId: 102,
      revieweeName: 'gamer_mike',
      rating: 4,
      title: 'Good experience',
      comment: 'Great communication and quick response time.',
      createdAt: '2025-12-15',
      type: 'given',
    },
    {
      id: 3,
      reviewerId: 103,
      reviewerName: 'player_john',
      revieweeId: 1,
      revieweeName: 'You',
      rating: 5,
      title: 'Amazing client!',
      comment: 'Fast payment and clear instructions. Will work again!',
      createdAt: '2025-12-18',
      type: 'received',
    },
    {
      id: 4,
      reviewerId: 104,
      reviewerName: 'gamer_sarah',
      revieweeId: 1,
      revieweeName: 'You',
      rating: 5,
      title: 'Highly professional',
      comment: 'Great promotions and excellent support.',
      createdAt: '2025-12-10',
      type: 'received',
    },
  ];

  const [reviews, setReviews] = useState(mockReviews);

  const filteredReviews = reviews.filter((review) => {
    if (activeTab === 'review_clients') return false; // Placeholder for client review functionality
    return review.type === activeTab;
  });

  const stats = {
    givenReviews: reviews.filter((r) => r.type === 'given').length,
    receivedReviews: reviews.filter((r) => r.type === 'received').length,
    avgRatingGiven:
      reviews.filter((r) => r.type === 'given').reduce((sum, r) => sum + r.rating, 0) /
      reviews.filter((r) => r.type === 'given').length || 0,
    avgRatingReceived:
      reviews.filter((r) => r.type === 'received').reduce((sum, r) => sum + r.rating, 0) /
      reviews.filter((r) => r.type === 'received').length || 0,
  };

  const handleWriteReview = async () => {
    if (!formData.clientUsername || !formData.title || !formData.comment) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await clientApi.createReview(formData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Review submitted successfully');
      setShowWriteReviewModal(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to submit review');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditReview = async () => {
    if (!selectedReview) return;

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await clientApi.updateReview(selectedReview.id, formData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Review updated successfully');
      setShowEditModal(false);
      setSelectedReview(null);
      resetForm();
    } catch (error) {
      toast.error('Failed to update review');
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
      // TODO: Replace with actual API call
      // await clientApi.deleteReview(reviewId);
      await new Promise((resolve) => setTimeout(resolve, 300));
      toast.success('Review deleted');
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (error) {
      toast.error('Failed to delete review');
      console.error(error);
    }
  };

  const openEditModal = (review: Review) => {
    setSelectedReview(review);
    setFormData({
      clientUsername: review.revieweeName,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
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
            onClick={() => interactive && onRate && onRate(star)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Reviews</h1>
          <p className="text-gray-400">Manage your reviews and reputation</p>
        </div>
        <button
          onClick={() => setShowWriteReviewModal(true)}
          className="bg-gold-600 hover:bg-gold-700 text-dark-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <MdRateReview size={20} />
          Write Review
        </button>
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

      {/* Reviews List */}
      <div className="space-y-4">
        {activeTab === 'review_clients' ? (
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
            <MdRateReview className="text-6xl text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">Search and review other clients</p>
            <p className="text-sm text-gray-500">This feature is coming soon</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
            <MdRateReview className="text-6xl text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No reviews found</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6 hover:shadow-gold transition-all"
            >
              <div className="flex items-start gap-4">
                <Avatar
                  name={review.type === 'given' ? review.revieweeName : review.reviewerName}
                  size="lg"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-white">{review.title}</h3>
                      <p className="text-sm text-gray-400">
                        {review.type === 'given' ? 'To' : 'From'}:{' '}
                        <span className="text-gold-500">
                          {review.type === 'given' ? review.revieweeName : review.reviewerName}
                        </span>
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
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                    {review.type === 'given' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(review)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                        >
                          <MdEdit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review.id, review.revieweeName)}
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
          ))
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
          <Input
            label="Player/Client Username"
            type="text"
            value={formData.clientUsername}
            onChange={(e) => setFormData({ ...formData, clientUsername: e.target.value })}
            placeholder="Enter username..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Rating</label>
            {renderStars(formData.rating, true, (rating) =>
              setFormData({ ...formData, rating })
            )}
          </div>
          <Input
            label="Review Title"
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
            label="Review Title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Comment</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={4}
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
