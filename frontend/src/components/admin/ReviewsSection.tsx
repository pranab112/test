import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import toast from 'react-hot-toast';
import { MdStar, MdCheck, MdClose, MdInfo, MdFilterList } from 'react-icons/md';
import { adminApi, type AdminReview, type ReviewStatus } from '@/api/endpoints';

const STATUS_COLORS: Record<ReviewStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  approved: 'bg-green-500/20 text-green-400 border-green-500/50',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/50',
  disputed: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
};

export function ReviewsSection() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | ''>('');
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    disputed: 0,
  });
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [statusFilter]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter) params.status_filter = statusFilter;
      const data = await adminApi.getPendingReviews(params);
      setReviews(data.reviews);
      setCounts({
        pending: data.pending_count,
        approved: data.approved_count,
        rejected: data.rejected_count,
        disputed: data.disputed_count,
      });
    } catch (error) {
      toast.error('Failed to load reviews');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (action: 'approve' | 'reject') => {
    if (!selectedReview) return;

    try {
      await adminApi.moderateReview(selectedReview.id, action, moderationNotes || undefined);
      toast.success(`Review ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      setShowModal(false);
      setSelectedReview(null);
      setModerationNotes('');
      loadReviews();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || `Failed to ${action} review`);
    }
  };

  const openModerationModal = (review: AdminReview) => {
    setSelectedReview(review);
    setModerationNotes('');
    setShowModal(true);
  };

  const columns = [
    {
      key: 'reviewer',
      label: 'Reviewer',
      render: (review: AdminReview) => review.reviewer?.username || 'Unknown',
    },
    {
      key: 'reviewee',
      label: 'Reviewee',
      render: (review: AdminReview) => review.reviewee?.username || 'Unknown',
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (review: AdminReview) => (
        <div className="flex items-center gap-1">
          <MdStar className="text-gold-500" />
          <span className="font-medium">{review.rating}/5</span>
        </div>
      ),
    },
    { key: 'title', label: 'Title', width: '20%' },
    {
      key: 'status',
      label: 'Status',
      render: (review: AdminReview) => (
        <span className={`px-2 py-1 rounded-full text-xs border ${STATUS_COLORS[review.status]}`}>
          {review.status.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (review: AdminReview) => new Date(review.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (review: AdminReview) => (
        <div className="flex gap-2">
          {review.status === 'pending' && (
            <>
              <button
                onClick={() => openModerationModal(review)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
              >
                <MdInfo size={14} />
                Review
              </button>
            </>
          )}
          {review.status !== 'pending' && (
            <span className="text-gray-500 text-sm">Moderated</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Review Moderation</h1>
        <p className="text-gray-400">Approve or reject user reviews before they become visible</p>
      </div>

      {/* Status Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-yellow-500/30">
          <div className="text-2xl font-bold text-yellow-400">{counts.pending}</div>
          <div className="text-gray-400 text-sm">Pending</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-green-500/30">
          <div className="text-2xl font-bold text-green-400">{counts.approved}</div>
          <div className="text-gray-400 text-sm">Approved</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-red-500/30">
          <div className="text-2xl font-bold text-red-400">{counts.rejected}</div>
          <div className="text-gray-400 text-sm">Rejected</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-purple-500/30">
          <div className="text-2xl font-bold text-purple-400">{counts.disputed}</div>
          <div className="text-gray-400 text-sm">Disputed</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <MdFilterList className="text-gold-500" size={20} />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReviewStatus | '')}
          className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-gold-500 focus:outline-none"
        >
          <option value="">All Reviews</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="disputed">Disputed</option>
        </select>
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

      {/* Moderation Modal */}
      {showModal && selectedReview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-lg w-full mx-4 border border-gray-700">
            <h3 className="text-xl font-bold text-gold-500 mb-4">Review Details</h3>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Reviewer:</span>
                <span className="text-white">{selectedReview.reviewer?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reviewee:</span>
                <span className="text-white">{selectedReview.reviewee?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rating:</span>
                <span className="text-gold-500 flex items-center gap-1">
                  <MdStar /> {selectedReview.rating}/5
                </span>
              </div>
              <div>
                <span className="text-gray-400">Title:</span>
                <p className="text-white mt-1">{selectedReview.title}</p>
              </div>
              {selectedReview.comment && (
                <div>
                  <span className="text-gray-400">Comment:</span>
                  <p className="text-white mt-1 bg-gray-800 p-3 rounded">{selectedReview.comment}</p>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm block mb-2">Admin Notes (optional):</label>
              <textarea
                value={moderationNotes}
                onChange={(e) => setModerationNotes(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-gold-500 focus:outline-none"
                rows={3}
                placeholder="Reason for rejection or notes..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleModerate('reject')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <MdClose size={18} />
                Reject
              </button>
              <button
                onClick={() => handleModerate('approve')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <MdCheck size={18} />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
