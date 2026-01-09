import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { MdWarning } from 'react-icons/md';
import { adminApi, type AdminPromotion as Promotion } from '@/api/endpoints';

export function PromotionsSection() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Cancel confirmation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingCancelPromotion, setPendingCancelPromotion] = useState<{ id: number; title: string } | null>(null);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPromotions({ limit: 100 });
      setPromotions(data.promotions);
      setTotal(data.total);
    } catch (error) {
      toast.error('Failed to load promotions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPromotion = (promotionId: number, title: string) => {
    setPendingCancelPromotion({ id: promotionId, title });
    setShowCancelModal(true);
  };

  const confirmCancelPromotion = async () => {
    if (!pendingCancelPromotion) return;

    try {
      await adminApi.cancelPromotion(pendingCancelPromotion.id);
      toast.success('Promotion cancelled');
      loadPromotions();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to cancel promotion');
    } finally {
      setShowCancelModal(false);
      setPendingCancelPromotion(null);
    }
  };

  const columns = [
    { key: 'title', label: 'Promotion' },
    {
      key: 'promotion_type',
      label: 'Type',
      render: (promo: Promotion) => (
        <Badge variant="info">{promo.promotion_type.toUpperCase()}</Badge>
      ),
    },
    { key: 'value', label: 'Value' },
    {
      key: 'total_claims',
      label: 'Claims',
      render: (promo: Promotion) => promo.total_claims || 0,
    },
    {
      key: 'status',
      label: 'Status',
      render: (promo: Promotion) => (
        <Badge
          variant={
            promo.status === 'active' ? 'success' :
            promo.status === 'cancelled' ? 'error' : 'default'
          }
          dot
        >
          {promo.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'end_date',
      label: 'End Date',
      render: (promo: Promotion) => new Date(promo.end_date).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (promo: Promotion) => (
        promo.status === 'active' ? (
          <button
            onClick={() => handleCancelPromotion(promo.id, promo.title)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        ) : (
          <span className="text-gray-500 text-sm">-</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Client Promotions</h1>
        <p className="text-gray-400">Monitor client-created promotions - Total: {total}</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gold-500">Loading promotions...</div>
      ) : (
        <DataTable
          data={promotions}
          columns={columns}
          emptyMessage="No promotions found"
        />
      )}

      {/* Cancel Promotion Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setPendingCancelPromotion(null);
        }}
        title="Cancel Promotion"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <MdWarning className="text-red-500 text-2xl flex-shrink-0" />
            <p className="text-gray-300">
              Are you sure you want to cancel the promotion{' '}
              <span className="text-white font-medium">"{pendingCancelPromotion?.title}"</span>?
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowCancelModal(false);
                setPendingCancelPromotion(null);
              }}
              variant="secondary"
              fullWidth
            >
              Keep Active
            </Button>
            <Button
              onClick={confirmCancelPromotion}
              variant="primary"
              fullWidth
              className="!bg-red-600 hover:!bg-red-700"
            >
              Cancel Promotion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
