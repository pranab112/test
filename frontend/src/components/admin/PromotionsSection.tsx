import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import toast from 'react-hot-toast';
import { adminApi, type Promotion } from '@/api/endpoints';

export function PromotionsSection() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

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

  const handleCancelPromotion = async (promotionId: number, title: string) => {
    if (!confirm(`Are you sure you want to cancel the promotion "${title}"?`)) {
      return;
    }

    try {
      await adminApi.cancelPromotion(promotionId);
      toast.success('Promotion cancelled');
      loadPromotions();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to cancel promotion');
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
    </div>
  );
}
