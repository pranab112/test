import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import toast from 'react-hot-toast';
import { MdStar, MdDelete } from 'react-icons/md';
import { adminApi, type Review } from '@/api/endpoints';

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getReviews({ limit: 100 });
      setReviews(data.reviews);
    } catch (error) {
      toast.error('Failed to load reviews');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      await adminApi.deleteReview(reviewId);
      toast.success('Review deleted');
      loadReviews();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete review');
    }
  };

  const columns = [
    {
      key: 'reviewer',
      label: 'Reviewer',
      render: (review: Review) => review.reviewer?.username || 'Unknown',
    },
    {
      key: 'reviewee',
      label: 'Reviewee',
      render: (review: Review) => review.reviewee?.username || 'Unknown',
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (review: Review) => (
        <div className="flex items-center gap-1">
          <MdStar className="text-gold-500" />
          <span className="font-medium">{review.rating}/5</span>
        </div>
      ),
    },
    { key: 'title', label: 'Title', width: '30%' },
    {
      key: 'created_at',
      label: 'Date',
      render: (review: Review) => new Date(review.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (review: Review) => (
        <button
          onClick={() => handleDeleteReview(review.id)}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
        >
          <MdDelete size={14} />
          Delete
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Reviews</h1>
        <p className="text-gray-400">Monitor platform reviews</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gold-500">Loading reviews...</div>
      ) : (
        <DataTable
          data={reviews}
          columns={columns}
          emptyMessage="No reviews found"
        />
      )}
    </div>
  );
}
