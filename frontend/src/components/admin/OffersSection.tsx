import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { FaGift, FaPlus, FaEdit, FaCheck, FaBan } from 'react-icons/fa';

// Types
interface PlatformOffer {
  id: number;
  title: string;
  description: string;
  offer_type: string;
  bonus_amount: number;
  max_claims: number | null;
  total_claims: number;
  status: 'active' | 'inactive' | 'expired';
  end_date: string | null;
  created_at: string;
}

interface OfferClaim {
  id: number;
  offer_id: number;
  offer_title: string;
  player_id: number;
  player_username: string;
  client_id: number;
  client_username: string;
  bonus_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  claimed_at: string;
  processed_at: string | null;
}

interface OfferFormData {
  title: string;
  description: string;
  offer_type: string;
  bonus_amount: string;
  max_claims: string;
  end_date: string;
}

const offerTypes = [
  { value: 'welcome_bonus', label: 'Welcome Bonus' },
  { value: 'deposit_match', label: 'Deposit Match' },
  { value: 'free_spins', label: 'Free Spins' },
  { value: 'cashback', label: 'Cashback' },
  { value: 'loyalty_reward', label: 'Loyalty Reward' },
  { value: 'special_event', label: 'Special Event' },
];

export function OffersSection() {
  const [activeTab, setActiveTab] = useState<'offers' | 'claims'>('offers');
  const [offers, setOffers] = useState<PlatformOffer[]>([]);
  const [claims, setClaims] = useState<OfferClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<PlatformOffer | null>(null);
  const [formData, setFormData] = useState<OfferFormData>({
    title: '',
    description: '',
    offer_type: 'welcome_bonus',
    bonus_amount: '',
    max_claims: '',
    end_date: '',
  });

  useEffect(() => {
    loadOffers();
    loadClaims();
  }, []);

  const loadOffers = async () => {
    try {
      // TODO: Replace with actual API call
      // const data = await adminApi.getPlatformOffers();
      // setOffers(data.offers);

      // Mock data for now
      setOffers([]);
    } catch (error) {
      toast.error('Failed to load platform offers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadClaims = async () => {
    try {
      // TODO: Replace with actual API call
      // const data = await adminApi.getOfferClaims();
      // setClaims(data.claims);

      // Mock data
      setClaims([]);
    } catch (error) {
      console.error('Failed to load offer claims:', error);
    }
  };

  const handleCreateOffer = async () => {
    try {
      // const offerData = {
      //   title: formData.title,
      //   description: formData.description,
      //   offer_type: formData.offer_type,
      //   bonus_amount: parseFloat(formData.bonus_amount),
      //   max_claims: formData.max_claims ? parseInt(formData.max_claims) : null,
      //   end_date: formData.end_date || null,
      // };

      // TODO: Replace with actual API call
      // await adminApi.createPlatformOffer(offerData);

      toast.success('Platform offer created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadOffers();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create offer');
    }
  };

  const handleUpdateOffer = async () => {
    if (!selectedOffer) return;

    try {
      // const offerData = {
      //   title: formData.title,
      //   description: formData.description,
      //   offer_type: formData.offer_type,
      //   bonus_amount: parseFloat(formData.bonus_amount),
      //   max_claims: formData.max_claims ? parseInt(formData.max_claims) : null,
      //   end_date: formData.end_date || null,
      // };

      // TODO: Replace with actual API call
      // await adminApi.updatePlatformOffer(selectedOffer.id, offerData);

      toast.success('Platform offer updated successfully!');
      setShowEditModal(false);
      setSelectedOffer(null);
      resetForm();
      loadOffers();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update offer');
    }
  };

  const handleToggleOfferStatus = async (_offerId: number) => {
    try {
      // TODO: Replace with actual API call
      // await adminApi.togglePlatformOfferStatus(offerId);

      toast.success('Offer status updated');
      loadOffers();
    } catch (error: any) {
      toast.error('Failed to update offer status');
    }
  };

  const openEditModal = (offer: PlatformOffer) => {
    setSelectedOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description,
      offer_type: offer.offer_type,
      bonus_amount: offer.bonus_amount.toString(),
      max_claims: offer.max_claims?.toString() || '',
      end_date: offer.end_date || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      offer_type: 'welcome_bonus',
      bonus_amount: '',
      max_claims: '',
      end_date: '',
    });
  };

  const filteredOffers = offers.filter((offer) => {
    if (statusFilter === 'all') return true;
    return offer.status === statusFilter;
  });

  const offersColumns = [
    {
      key: 'title',
      label: 'Title',
      render: (offer: PlatformOffer) => (
        <div>
          <div className="font-semibold text-white">{offer.title}</div>
          <div className="text-sm text-gray-400 truncate max-w-xs">
            {offer.description}
          </div>
        </div>
      ),
    },
    {
      key: 'offer_type',
      label: 'Type',
      render: (offer: PlatformOffer) => (
        <Badge variant="info">
          {offerTypes.find((t) => t.value === offer.offer_type)?.label || offer.offer_type}
        </Badge>
      ),
    },
    {
      key: 'bonus_amount',
      label: 'Bonus',
      render: (offer: PlatformOffer) => (
        <span className="text-gold-500 font-semibold">
          ${offer.bonus_amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'claims',
      label: 'Claims',
      render: (offer: PlatformOffer) => (
        <span className="text-gray-300">
          {offer.total_claims}
          {offer.max_claims && ` / ${offer.max_claims}`}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (offer: PlatformOffer) => {
        const variantMap = {
          active: 'success' as const,
          inactive: 'default' as const,
          expired: 'error' as const,
        };
        return (
          <Badge variant={variantMap[offer.status]}>
            {offer.status}
          </Badge>
        );
      },
    },
    {
      key: 'end_date',
      label: 'End Date',
      render: (offer: PlatformOffer) => (
        <span className="text-gray-400">
          {offer.end_date
            ? new Date(offer.end_date).toLocaleDateString()
            : 'No expiry'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (offer: PlatformOffer) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEditModal(offer)}
            className="text-blue-500 hover:text-blue-400 p-1"
            title="Edit offer"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleToggleOfferStatus(offer.id)}
            className={`p-1 ${
              offer.status === 'active'
                ? 'text-red-500 hover:text-red-400'
                : 'text-green-500 hover:text-green-400'
            }`}
            title={offer.status === 'active' ? 'Deactivate' : 'Activate'}
          >
            {offer.status === 'active' ? <FaBan /> : <FaCheck />}
          </button>
        </div>
      ),
    },
  ];

  const claimsColumns = [
    {
      key: 'offer_title',
      label: 'Offer',
      render: (claim: OfferClaim) => (
        <span className="text-white font-medium">{claim.offer_title}</span>
      ),
    },
    {
      key: 'player',
      label: 'Player',
      render: (claim: OfferClaim) => (
        <span className="text-gray-300">{claim.player_username}</span>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (claim: OfferClaim) => (
        <span className="text-gray-300">{claim.client_username}</span>
      ),
    },
    {
      key: 'bonus_amount',
      label: 'Bonus',
      render: (claim: OfferClaim) => (
        <span className="text-gold-500 font-semibold">
          ${claim.bonus_amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (claim: OfferClaim) => {
        const variantMap = {
          pending: 'pending' as const,
          approved: 'approved' as const,
          rejected: 'rejected' as const,
          completed: 'info' as const,
        };
        return <Badge variant={variantMap[claim.status]}>{claim.status}</Badge>;
      },
    },
    {
      key: 'claimed_at',
      label: 'Claimed At',
      render: (claim: OfferClaim) => (
        <span className="text-gray-400">
          {new Date(claim.claimed_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'processed_at',
      label: 'Processed At',
      render: (claim: OfferClaim) => (
        <span className="text-gray-400">
          {claim.processed_at
            ? new Date(claim.processed_at).toLocaleDateString()
            : '-'}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-500">Loading platform offers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaGift className="text-gold-500" />
            Platform Offers
          </h2>
          <p className="text-gray-400 mt-1">
            Manage platform-wide promotional offers
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <FaPlus className="mr-2" />
          Create Offer
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-dark-400">
        <button
          onClick={() => setActiveTab('offers')}
          className={`pb-3 px-4 font-semibold transition-colors ${
            activeTab === 'offers'
              ? 'text-gold-500 border-b-2 border-gold-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Offers ({offers.length})
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`pb-3 px-4 font-semibold transition-colors ${
            activeTab === 'claims'
              ? 'text-gold-500 border-b-2 border-gold-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Claims ({claims.length})
        </button>
      </div>

      {/* Offers Tab */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            {['all', 'active', 'inactive', 'expired'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-gold-500 text-dark-900 font-semibold'
                    : 'bg-dark-400 text-gray-300 hover:bg-dark-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Offers Table */}
          {filteredOffers.length > 0 ? (
            <DataTable columns={offersColumns} data={filteredOffers} />
          ) : (
            <div className="text-center py-12 bg-dark-400 rounded-lg">
              <FaGift className="text-4xl text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No platform offers found</p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-4"
              >
                <FaPlus className="mr-2" />
                Create First Offer
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Claims Tab */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          {claims.length > 0 ? (
            <DataTable columns={claimsColumns} data={claims} />
          ) : (
            <div className="text-center py-12 bg-dark-400 rounded-lg">
              <p className="text-gray-400">No offer claims yet</p>
            </div>
          )}
        </div>
      )}

      {/* Create Offer Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Platform Offer"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="e.g., Welcome Bonus"
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 bg-dark-400 border border-dark-300 rounded-lg text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
              rows={3}
              placeholder="Describe the offer..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Offer Type
            </label>
            <select
              value={formData.offer_type}
              onChange={(e) =>
                setFormData({ ...formData, offer_type: e.target.value })
              }
              className="w-full px-4 py-2 bg-dark-400 border border-dark-300 rounded-lg text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            >
              {offerTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Bonus Amount ($)"
            type="number"
            value={formData.bonus_amount}
            onChange={(e) =>
              setFormData({ ...formData, bonus_amount: e.target.value })
            }
            placeholder="e.g., 50"
          />
          <Input
            label="Max Claims (optional)"
            type="number"
            value={formData.max_claims}
            onChange={(e) =>
              setFormData({ ...formData, max_claims: e.target.value })
            }
            placeholder="Leave empty for unlimited"
          />
          <Input
            label="End Date (optional)"
            type="date"
            value={formData.end_date}
            onChange={(e) =>
              setFormData({ ...formData, end_date: e.target.value })
            }
          />
          <div className="flex gap-3 pt-4">
            <Button onClick={handleCreateOffer} className="flex-1">
              Create Offer
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Offer Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedOffer(null);
          resetForm();
        }}
        title="Edit Platform Offer"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="e.g., Welcome Bonus"
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 bg-dark-400 border border-dark-300 rounded-lg text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
              rows={3}
              placeholder="Describe the offer..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Offer Type
            </label>
            <select
              value={formData.offer_type}
              onChange={(e) =>
                setFormData({ ...formData, offer_type: e.target.value })
              }
              className="w-full px-4 py-2 bg-dark-400 border border-dark-300 rounded-lg text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
            >
              {offerTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Bonus Amount ($)"
            type="number"
            value={formData.bonus_amount}
            onChange={(e) =>
              setFormData({ ...formData, bonus_amount: e.target.value })
            }
            placeholder="e.g., 50"
          />
          <Input
            label="Max Claims (optional)"
            type="number"
            value={formData.max_claims}
            onChange={(e) =>
              setFormData({ ...formData, max_claims: e.target.value })
            }
            placeholder="Leave empty for unlimited"
          />
          <Input
            label="End Date (optional)"
            type="date"
            value={formData.end_date}
            onChange={(e) =>
              setFormData({ ...formData, end_date: e.target.value })
            }
          />
          <div className="flex gap-3 pt-4">
            <Button onClick={handleUpdateOffer} className="flex-1">
              Update Offer
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                setSelectedOffer(null);
                resetForm();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
