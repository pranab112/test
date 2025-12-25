import { useState } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import toast from 'react-hot-toast';
import { MdStar, MdStarBorder, MdRateReview } from 'react-icons/md';

interface Review {
  id: number;
  user: string;
  user_type: 'client' | 'player';
  rating: number;
  title: string;
  comment: string;
  created_at: string;
}

// TODO: Replace with API data
const MOCK_GIVEN_REVIEWS: Review[] = [
  {
    id: 1,
    user: 'ABC Gaming Company',
    user_type: 'client',
    rating: 5,
    title: 'Great client!',
    comment: 'Excellent promotions and fast support. Highly recommended!',
    created_at: '2025-12-20',
  },
  {
    id: 2,
    user: 'XYZ Casino Corp',
    user_type: 'client',
    rating: 4,
    title: 'Good experience',
    comment: 'Nice game selection, but support could be faster.',
    created_at: '2025-12-18',
  },
];

const MOCK_RECEIVED_REVIEWS: Review[] = [
  {
    id: 1,
    user: 'ABC Gaming Company',
    user_type: 'client',
    rating: 4,
    title: 'Good player',
    comment: 'Active and follows the rules. Pleasure to have them on our platform.',
    created_at: '2025-12-22',
  },
  {
    id: 2,
    user: 'player_john',
    user_type: 'player',
    rating: 5,
    title: 'Awesome friend!',
    comment: 'Always helpful and fun to play with!',
    created_at: '2025-12-21',
  },
];

const MOCK_REVIEWABLE_ENTITIES = [
  { id: 1, name: 'Golden Entertainment', type: 'client' },
  { id: 2, name: 'player_sarah', type: 'player' },
];

export function ReviewsSection() {
  const [activeTab, setActiveTab] = useState<'given' | 'received' | 'write'>('given');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<typeof MOCK_REVIEWABLE_ENTITIES[0] | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleWriteReview = (entity: typeof MOCK_REVIEWABLE_ENTITIES[0]) => {
    setSelectedEntity(entity);
    setRating(0);
    setHoverRating(0);
    setReviewTitle('');
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = () => {
    if (!selectedEntity) return;
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!reviewTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!reviewComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmitting(true);
    // TODO: API call to submit review
    setTimeout(() => {
      setSubmitting(false);
      toast.success(`Review submitted for ${selectedEntity.name}!`);
      setShowReviewModal(false);
      setActiveTab('given');
    }, 1000);
  };

  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = interactive
            ? star <= (hoverRating || rating)
            : star <= rating;

          return (
            <button
              key={star}
              type="button"
              onClick={() => interactive && onRate?.(star)}
              onMouseEnter={() => interactive && setHoverRating(star)}
              onMouseLeave={() => interactive && setHoverRating(0)}
              disabled={!interactive}
              className={`text-2xl ${
                interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''
              } ${filled ? 'text-gold-500' : 'text-gray-600'}`}
            >
              {filled ? <MdStar /> : <MdStarBorder />}
            </button>
          );
        })}
      </div>
    );
  };

  const givenColumns = [
    {
      key: 'user',
      label: 'Reviewed',
      render: (review: Review) => (
        <div>
          <div className="font-medium text-white">{review.user}</div>
          <Badge variant={review.user_type === 'client' ? 'info' : 'purple'} size="sm">
            {review.user_type}
          </Badge>
        </div>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (review: Review) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <MdStar className="text-gold-500 text-xl" />
            <span className="font-bold text-white">{review.rating}</span>
          </div>
          {renderStars(review.rating)}
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      width: '25%',
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (review: Review) => (
        <span className="text-sm text-gray-400">
          {new Date(review.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_review: Review) => (
        <button
          onClick={() => toast.success('Opening review details')}
          className="text-blue-500 hover:text-blue-400 text-sm font-medium"
        >
          View Details
        </button>
      ),
    },
  ];

  const receivedColumns = [
    {
      key: 'user',
      label: 'From',
      render: (review: Review) => (
        <div>
          <div className="font-medium text-white">{review.user}</div>
          <Badge variant={review.user_type === 'client' ? 'info' : 'purple'} size="sm">
            {review.user_type}
          </Badge>
        </div>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (review: Review) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <MdStar className="text-gold-500 text-xl" />
            <span className="font-bold text-white">{review.rating}</span>
          </div>
          {renderStars(review.rating)}
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      width: '25%',
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (review: Review) => (
        <span className="text-sm text-gray-400">
          {new Date(review.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_review: Review) => (
        <button
          onClick={() => toast.success('Opening review details')}
          className="text-blue-500 hover:text-blue-400 text-sm font-medium"
        >
          View Details
        </button>
      ),
    },
  ];

  const averageRating = MOCK_RECEIVED_REVIEWS.length > 0
    ? (MOCK_RECEIVED_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / MOCK_RECEIVED_REVIEWS.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500">Reviews</h1>
          <p className="text-gray-400 mt-1">
            {activeTab === 'given' && `You have given ${MOCK_GIVEN_REVIEWS.length} reviews`}
            {activeTab === 'received' && `You have received ${MOCK_RECEIVED_REVIEWS.length} reviews`}
            {activeTab === 'write' && 'Write a new review'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('given')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'given'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Given ({MOCK_GIVEN_REVIEWS.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'received'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Received ({MOCK_RECEIVED_REVIEWS.length})
          </button>
          <button
            onClick={() => setActiveTab('write')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'write'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Write Review
          </button>
        </div>
      </div>

      {/* Average Rating Card (for received reviews) */}
      {activeTab === 'received' && (
        <div className="bg-gradient-to-r from-gold-900/40 to-yellow-900/40 border-2 border-gold-700 rounded-lg p-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-6xl font-bold text-gold-500">{averageRating}</p>
              <div className="flex items-center justify-center mt-2">
                {renderStars(parseFloat(averageRating))}
              </div>
              <p className="text-sm text-gray-400 mt-2">Average Rating</p>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gold-500 mb-2">Your Reputation</h3>
              <p className="text-gray-300 mb-3">
                Based on {MOCK_RECEIVED_REVIEWS.length} reviews from clients and players
              </p>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = MOCK_RECEIVED_REVIEWS.filter(r => r.rating === stars).length;
                  const percentage = MOCK_RECEIVED_REVIEWS.length > 0
                    ? (count / MOCK_RECEIVED_REVIEWS.length) * 100
                    : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-12">{stars} stars</span>
                      <div className="flex-1 bg-dark-400 rounded-full h-2">
                        <div
                          className="bg-gold-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400 w-12">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Tables */}
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        {activeTab === 'given' && (
          <>
            <h2 className="text-xl font-bold text-gold-500 mb-4">Reviews You've Given</h2>
            <DataTable
              data={MOCK_GIVEN_REVIEWS}
              columns={givenColumns}
              emptyMessage="You haven't written any reviews yet"
            />
          </>
        )}

        {activeTab === 'received' && (
          <>
            <h2 className="text-xl font-bold text-gold-500 mb-4">Reviews You've Received</h2>
            <DataTable
              data={MOCK_RECEIVED_REVIEWS}
              columns={receivedColumns}
              emptyMessage="You haven't received any reviews yet"
            />
          </>
        )}

        {activeTab === 'write' && (
          <>
            <h2 className="text-xl font-bold text-gold-500 mb-4 flex items-center gap-2">
              <MdRateReview className="text-2xl" />
              Write a New Review
            </h2>
            <div className="space-y-4">
              <p className="text-gray-400">Select who you want to review:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MOCK_REVIEWABLE_ENTITIES.map((entity) => (
                  <button
                    key={entity.id}
                    onClick={() => handleWriteReview(entity)}
                    className="bg-dark-300 border-2 border-gold-700 rounded-lg p-6 text-left hover:bg-dark-400 hover:shadow-gold transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{entity.name}</h3>
                        <Badge variant={entity.type === 'client' ? 'info' : 'purple'}>
                          {entity.type}
                        </Badge>
                      </div>
                      <MdRateReview className="text-3xl text-gold-500" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Write Review Modal */}
      {showReviewModal && selectedEntity && (
        <Modal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedEntity(null);
          }}
          title={`Write Review for ${selectedEntity.name}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="bg-dark-300 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedEntity.name}</h3>
                  <Badge variant={selectedEntity.type === 'client' ? 'info' : 'purple'}>
                    {selectedEntity.type}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                {renderStars(rating, true, setRating)}
                {rating > 0 && (
                  <span className="text-lg font-bold text-gold-500">{rating}/5</span>
                )}
              </div>
            </div>

            <div>
              <Input
                label="Title *"
                placeholder="Brief summary of your review"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Comment <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience..."
                rows={5}
                className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSubmitReview}
                loading={submitting}
                variant="primary"
                fullWidth
              >
                Submit Review
              </Button>
              <Button
                onClick={() => setShowReviewModal(false)}
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
