import { useState } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { MdCardGiftcard, MdCheckCircle } from 'react-icons/md';

interface Promotion {
  id: number;
  title: string;
  description: string;
  client: string;
  client_id: number;
  type: 'bonus' | 'cashback' | 'credits' | 'free_spins';
  value: number;
  status: 'available' | 'claimed' | 'expired';
  start_date: string;
  end_date: string;
  terms?: string;
}

// TODO: Replace with API data
const MOCK_PROMOTIONS: Promotion[] = [
  {
    id: 1,
    title: 'Welcome Bonus',
    description: 'Get 100 bonus credits for new players',
    client: 'ABC Gaming Company',
    client_id: 1,
    type: 'bonus',
    value: 100,
    status: 'available',
    start_date: '2025-12-01',
    end_date: '2025-12-31',
    terms: 'Valid for first-time deposits only. Must be claimed within 7 days of registration.',
  },
  {
    id: 2,
    title: 'Weekend Cashback',
    description: '20% cashback on weekend play',
    client: 'XYZ Casino Corp',
    client_id: 2,
    type: 'cashback',
    value: 20,
    status: 'claimed',
    start_date: '2025-12-20',
    end_date: '2025-12-30',
    terms: 'Cashback calculated on net losses. Maximum cashback: 500 credits.',
  },
  {
    id: 3,
    title: 'Level Up Reward',
    description: 'Bonus credits for reaching level 15',
    client: 'ABC Gaming Company',
    client_id: 1,
    type: 'credits',
    value: 50,
    status: 'available',
    start_date: '2025-12-15',
    end_date: '2025-12-28',
    terms: 'Automatically credited upon reaching level 15.',
  },
  {
    id: 4,
    title: 'Holiday Special',
    description: 'Special holiday bonus - 200 credits',
    client: 'Golden Entertainment',
    client_id: 3,
    type: 'bonus',
    value: 200,
    status: 'available',
    start_date: '2025-12-24',
    end_date: '2025-12-31',
    terms: 'Limited time offer. Available while supplies last.',
  },
  {
    id: 5,
    title: 'Daily Free Spins',
    description: '10 free spins every day',
    client: 'XYZ Casino Corp',
    client_id: 2,
    type: 'free_spins',
    value: 10,
    status: 'claimed',
    start_date: '2025-12-01',
    end_date: '2026-01-31',
    terms: 'Free spins expire after 24 hours. Valid on selected games only.',
  },
];

export function PromotionsSection() {
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'claimed'>('all');

  const handleViewDetails = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setShowDetailsModal(true);
  };

  const handleClaimPromotion = (promotion: Promotion) => {
    setClaiming(true);
    // TODO: API call to claim promotion
    setTimeout(() => {
      setClaiming(false);
      toast.success(`Successfully claimed "${promotion.title}"!`);
      setShowDetailsModal(false);
    }, 1000);
  };

  const getTypeColor = (type: Promotion['type']): 'success' | 'purple' | 'warning' | 'info' | 'default' => {
    switch (type) {
      case 'bonus': return 'success';
      case 'cashback': return 'purple';
      case 'credits': return 'warning';
      case 'free_spins': return 'info';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: Promotion['type']) => {
    switch (type) {
      case 'bonus': return 'Bonus';
      case 'cashback': return 'Cashback';
      case 'credits': return 'Credits';
      case 'free_spins': return 'Free Spins';
      default: return type;
    }
  };

  const filteredPromotions = MOCK_PROMOTIONS.filter(promo => {
    if (filter === 'all') return true;
    return promo.status === filter;
  });

  const columns = [
    {
      key: 'title',
      label: 'Promotion',
      width: '25%',
      render: (promo: Promotion) => (
        <div>
          <div className="font-medium text-white">{promo.title}</div>
          <div className="text-xs text-gray-400 mt-1">{promo.description}</div>
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (promo: Promotion) => (
        <span className="text-gray-300">{promo.client}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (promo: Promotion) => (
        <Badge variant={getTypeColor(promo.type)}>
          {getTypeLabel(promo.type)}
        </Badge>
      ),
    },
    {
      key: 'value',
      label: 'Value',
      render: (promo: Promotion) => (
        <span className="font-bold text-gold-500">
          {promo.type === 'cashback' ? `${promo.value}%` : promo.value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (promo: Promotion) => {
        const variant = promo.status === 'available' ? 'success' : promo.status === 'claimed' ? 'default' : 'error';
        return (
          <Badge variant={variant}>
            {promo.status.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: 'end_date',
      label: 'Expires',
      render: (promo: Promotion) => (
        <span className="text-sm text-gray-400">
          {new Date(promo.end_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (promo: Promotion) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewDetails(promo)}
            className="text-blue-500 hover:text-blue-400 text-sm font-medium"
          >
            Details
          </button>
          {promo.status === 'available' && (
            <button
              onClick={() => {
                setSelectedPromotion(promo);
                handleClaimPromotion(promo);
              }}
              className="bg-gold-gradient text-dark-700 font-bold px-3 py-1 rounded text-sm hover:shadow-gold transition-all"
            >
              Claim
            </button>
          )}
          {promo.status === 'claimed' && (
            <span className="text-gray-500 text-sm flex items-center gap-1">
              <MdCheckCircle className="text-green-500" />
              Claimed
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Promotions</h1>
          <p className="text-gray-400">Available promotions from your clients</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            All ({MOCK_PROMOTIONS.length})
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'available'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Available ({MOCK_PROMOTIONS.filter(p => p.status === 'available').length})
          </button>
          <button
            onClick={() => setFilter('claimed')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'claimed'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Claimed ({MOCK_PROMOTIONS.filter(p => p.status === 'claimed').length})
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-2 border-green-700 rounded-lg p-6">
          <MdCardGiftcard className="text-4xl text-green-500 mb-2" />
          <p className="text-2xl font-bold text-white">
            {MOCK_PROMOTIONS.filter(p => p.status === 'available').length}
          </p>
          <p className="text-sm text-green-400">Available Promotions</p>
        </div>

        <div className="bg-gradient-to-br from-gold-900/30 to-yellow-800/20 border-2 border-gold-700 rounded-lg p-6">
          <MdCheckCircle className="text-4xl text-gold-500 mb-2" />
          <p className="text-2xl font-bold text-white">
            {MOCK_PROMOTIONS.filter(p => p.status === 'claimed').length}
          </p>
          <p className="text-sm text-gold-400">Claimed This Month</p>
        </div>

        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-2 border-purple-700 rounded-lg p-6">
          <MdCardGiftcard className="text-4xl text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-white">
            {MOCK_PROMOTIONS.reduce((sum, p) => p.status === 'claimed' ? sum + (p.type === 'cashback' ? 0 : p.value) : sum, 0)}
          </p>
          <p className="text-sm text-purple-400">Total Credits Earned</p>
        </div>
      </div>

      {/* Promotions Table */}
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        <DataTable
          data={filteredPromotions}
          columns={columns}
          emptyMessage={
            filter === 'all'
              ? 'No promotions available'
              : `No ${filter} promotions`
          }
        />
      </div>

      {/* Promotion Details Modal */}
      {showDetailsModal && selectedPromotion && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPromotion(null);
          }}
          title={selectedPromotion.title}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-dark-300 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gold-500 mb-2">
                    {selectedPromotion.title}
                  </h3>
                  <p className="text-gray-300">{selectedPromotion.description}</p>
                </div>
                <Badge variant={getTypeColor(selectedPromotion.type)} size="lg">
                  {getTypeLabel(selectedPromotion.type)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Client</p>
                  <p className="font-medium text-white">{selectedPromotion.client}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Value</p>
                  <p className="font-bold text-gold-500 text-xl">
                    {selectedPromotion.type === 'cashback'
                      ? `${selectedPromotion.value}%`
                      : selectedPromotion.value}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Start Date</p>
                  <p className="text-white">
                    {new Date(selectedPromotion.start_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">End Date</p>
                  <p className="text-white">
                    {new Date(selectedPromotion.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Status</p>
                <Badge
                  variant={
                    selectedPromotion.status === 'available'
                      ? 'success'
                      : selectedPromotion.status === 'claimed'
                      ? 'default'
                      : 'error'
                  }
                >
                  {selectedPromotion.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {selectedPromotion.terms && (
              <div className="bg-dark-300 rounded-lg p-4">
                <h4 className="font-bold text-gold-500 mb-2">Terms & Conditions</h4>
                <p className="text-sm text-gray-300">{selectedPromotion.terms}</p>
              </div>
            )}

            {selectedPromotion.status === 'available' && (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleClaimPromotion(selectedPromotion)}
                  loading={claiming}
                  variant="primary"
                  fullWidth
                >
                  Claim Promotion
                </Button>
                <Button
                  onClick={() => setShowDetailsModal(false)}
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            )}

            {selectedPromotion.status === 'claimed' && (
              <div className="bg-green-900/30 border-2 border-green-500 rounded-lg p-4 text-center">
                <MdCheckCircle className="text-4xl text-green-500 mx-auto mb-2" />
                <p className="text-green-400 font-bold">Already Claimed</p>
                <p className="text-sm text-gray-400 mt-1">
                  You have already claimed this promotion
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
