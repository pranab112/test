import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { FaGift, FaPlus, FaEdit, FaCheck, FaBan } from 'react-icons/fa';
import { MdRefresh, MdDelete } from 'react-icons/md';
import {
  offersApi,
  type PlatformOffer,
  type OfferClaim,
  type OfferType,
  type OfferStatus,
  type OfferClaimStatus,
} from '@/api/endpoints/offers.api';

interface OfferFormData {
  title: string;
  description: string;
  offer_type: OfferType;
  bonus_amount: string;
  requirement_description: string;
  max_claims: string;
  max_claims_per_player: string;
  end_date: string;
}

const offerTypes: { value: OfferType; label: string }[] = [
  { value: 'email_verification', label: 'Email Verification' },
  { value: 'profile_completion', label: 'Profile Completion' },
  { value: 'first_deposit', label: 'First Deposit' },
  { value: 'referral', label: 'Referral' },
  { value: 'loyalty', label: 'Loyalty Reward' },
  { value: 'special_event', label: 'Special Event' },
];

export function OffersSection() {
  const [activeTab, setActiveTab] = useState<'offers' | 'claims'>('offers');
  const [offers, setOffers] = useState<PlatformOffer[]>([]);
  const [claims, setClaims] = useState<OfferClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [claimsStatusFilter, setClaimsStatusFilter] = useState<string>('pending');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<PlatformOffer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<OfferFormData>({
    title: '',
    description: '',
    offer_type: 'email_verification',
    bonus_amount: '',
    requirement_description: '',
    max_claims: '',
    max_claims_per_player: '1',
    end_date: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [offersData, claimsData] = await Promise.all([
        offersApi.getAllOffersAdmin(true),
        offersApi.getAllClaimsAdmin(),
      ]);
      setOffers(offersData);
      setClaims(claimsData);
    } catch (error) {
      toast.error('Failed to load platform offers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!formData.title || !formData.description || !formData.bonus_amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await offersApi.createOffer({
        title: formData.title,
        description: formData.description,
        offer_type: formData.offer_type,
        bonus_amount: parseInt(formData.bonus_amount),
        requirement_description: formData.requirement_description || undefined,
        max_claims: formData.max_claims ? parseInt(formData.max_claims) : undefined,
        max_claims_per_player: formData.max_claims_per_player
          ? parseInt(formData.max_claims_per_player)
          : 1,
        end_date: formData.end_date || undefined,
      });

      toast.success('Platform offer created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOffer = async () => {
    if (!selectedOffer) return;

    setSubmitting(true);
    try {
      await offersApi.updateOffer(selectedOffer.id, {
        title: formData.title,
        description: formData.description,
        offer_type: formData.offer_type,
        bonus_amount: parseInt(formData.bonus_amount),
        requirement_description: formData.requirement_description || undefined,
        max_claims: formData.max_claims ? parseInt(formData.max_claims) : undefined,
        max_claims_per_player: formData.max_claims_per_player
          ? parseInt(formData.max_claims_per_player)
          : 1,
        end_date: formData.end_date || undefined,
      });

      toast.success('Platform offer updated successfully!');
      setShowEditModal(false);
      setSelectedOffer(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to update offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleOfferStatus = async (offer: PlatformOffer) => {
    try {
      if (offer.status === 'active') {
        // Deactivate
        await offersApi.deleteOffer(offer.id);
        toast.success('Offer deactivated');
      } else {
        // Activate
        await offersApi.updateOffer(offer.id, { status: 'active' as OfferStatus });
        toast.success('Offer activated');
      }
      loadData();
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to update offer status');
    }
  };

  const handleDeleteOffer = async (offer: PlatformOffer) => {
    if (!confirm(`Are you sure you want to deactivate "${offer.title}"?`)) {
      return;
    }

    try {
      await offersApi.deleteOffer(offer.id);
      toast.success('Offer deactivated');
      loadData();
    } catch (error: any) {
      toast.error(error?.detail || 'Failed to delete offer');
    }
  };

  const handleProcessClaim = async (claim: OfferClaim, status: OfferClaimStatus) => {
    const action = status === 'approved' ? 'approve' : 'reject';
    if (!confirm(`Are you sure you want to ${action} this claim for ${claim.player_name}?`)) {
      return;
    }

    try {
      await offersApi.processClaimAdmin(claim.id, { status });
      toast.success(`Claim ${status === 'approved' ? 'approved' : 'rejected'} successfully!`);
      loadData();
    } catch (error: any) {
      toast.error(error?.detail || `Failed to ${action} claim`);
    }
  };

  const openEditModal = (offer: PlatformOffer) => {
    setSelectedOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description,
      offer_type: offer.offer_type,
      bonus_amount: offer.bonus_amount.toString(),
      requirement_description: offer.requirement_description || '',
      max_claims: offer.max_claims?.toString() || '',
      max_claims_per_player: offer.max_claims_per_player?.toString() || '1',
      end_date: offer.end_date ? offer.end_date.split('T')[0] : '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      offer_type: 'email_verification',
      bonus_amount: '',
      requirement_description: '',
      max_claims: '',
      max_claims_per_player: '1',
      end_date: '',
    });
  };

  const filteredOffers = offers.filter((offer) => {
    if (statusFilter === 'all') return true;
    return offer.status === statusFilter;
  });

  const filteredClaims = claims.filter((claim) => {
    if (claimsStatusFilter === 'all') return true;
    return claim.status === claimsStatusFilter;
  });

  const pendingClaimsCount = claims.filter((c) => c.status === 'pending').length;

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
          {offerTypes.find((t) => t.value === offer.offer_type)?.label ||
            offer.offer_type.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'bonus_amount',
      label: 'Bonus',
      render: (offer: PlatformOffer) => (
        <span className="text-gold-500 font-semibold">${offer.bonus_amount}</span>
      ),
    },
    {
      key: 'claims',
      label: 'Claims',
      render: (offer: PlatformOffer) => (
        <span className="text-gray-300">
          {offer.total_claims || 0}
          {offer.max_claims && ` / ${offer.max_claims}`}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (offer: PlatformOffer) => {
        const variantMap: Record<OfferStatus, 'success' | 'default' | 'error'> = {
          active: 'success',
          inactive: 'default',
          expired: 'error',
        };
        return <Badge variant={variantMap[offer.status]}>{offer.status}</Badge>;
      },
    },
    {
      key: 'end_date',
      label: 'End Date',
      render: (offer: PlatformOffer) => (
        <span className="text-gray-400">
          {offer.end_date ? new Date(offer.end_date).toLocaleDateString() : 'No expiry'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (offer: PlatformOffer) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openEditModal(offer)}
            className="text-blue-500 hover:text-blue-400 p-1"
            title="Edit offer"
          >
            <FaEdit />
          </button>
          <button
            type="button"
            onClick={() => handleToggleOfferStatus(offer)}
            className={`p-1 ${
              offer.status === 'active'
                ? 'text-red-500 hover:text-red-400'
                : 'text-green-500 hover:text-green-400'
            }`}
            title={offer.status === 'active' ? 'Deactivate' : 'Activate'}
          >
            {offer.status === 'active' ? <FaBan /> : <FaCheck />}
          </button>
          <button
            type="button"
            onClick={() => handleDeleteOffer(offer)}
            className="text-red-500 hover:text-red-400 p-1"
            title="Delete offer"
          >
            <MdDelete />
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
        <span className="text-white font-medium">{claim.offer_title || 'Unknown'}</span>
      ),
    },
    {
      key: 'player',
      label: 'Player',
      render: (claim: OfferClaim) => (
        <span className="text-gray-300">{claim.player_name || 'Unknown'}</span>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (claim: OfferClaim) => (
        <span className="text-gray-300">{claim.client_name || 'Unknown'}</span>
      ),
    },
    {
      key: 'bonus_amount',
      label: 'Bonus',
      render: (claim: OfferClaim) => (
        <span className="text-gold-500 font-semibold">${claim.bonus_amount}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (claim: OfferClaim) => {
        const variantMap: Record<string, 'warning' | 'success' | 'error' | 'info'> = {
          pending: 'warning',
          approved: 'success',
          rejected: 'error',
          completed: 'info',
        };
        return <Badge variant={variantMap[claim.status] || 'default'}>{claim.status}</Badge>;
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
          {claim.processed_at ? new Date(claim.processed_at).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (claim: OfferClaim) => (
        claim.status === 'pending' ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleProcessClaim(claim, 'approved')}
              className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              title="Approve claim"
            >
              <FaCheck /> Approve
            </button>
            <button
              type="button"
              onClick={() => handleProcessClaim(claim, 'rejected')}
              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              title="Reject claim"
            >
              <FaBan /> Reject
            </button>
          </div>
        ) : (
          <span className="text-gray-500 text-sm">Processed</span>
        )
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
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadData}>
            <MdRefresh className="mr-1" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <FaPlus className="mr-2" />
            Create Offer
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-dark-400">
        <button
          type="button"
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
          type="button"
          onClick={() => setActiveTab('claims')}
          className={`pb-3 px-4 font-semibold transition-colors ${
            activeTab === 'claims'
              ? 'text-gold-500 border-b-2 border-gold-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Claims ({claims.length})
          {pendingClaimsCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {pendingClaimsCount} pending
            </span>
          )}
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
                type="button"
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
              <Button onClick={() => setShowCreateModal(true)} className="mt-4">
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
          {/* Claims Filter */}
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected', 'all'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setClaimsStatusFilter(status)}
                className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                  claimsStatusFilter === status
                    ? status === 'pending'
                      ? 'bg-yellow-500 text-dark-900 font-semibold'
                      : 'bg-gold-500 text-dark-900 font-semibold'
                    : 'bg-dark-400 text-gray-300 hover:bg-dark-300'
                }`}
              >
                {status}
                {status === 'pending' && pendingClaimsCount > 0 && (
                  <span className="ml-1">({pendingClaimsCount})</span>
                )}
              </button>
            ))}
          </div>

          {filteredClaims.length > 0 ? (
            <DataTable columns={claimsColumns} data={filteredClaims} />
          ) : (
            <div className="text-center py-12 bg-dark-400 rounded-lg">
              <p className="text-gray-400">
                {claimsStatusFilter === 'pending'
                  ? 'No pending claims to approve'
                  : `No ${claimsStatusFilter === 'all' ? '' : claimsStatusFilter} claims yet`}
              </p>
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
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Email Verification Bonus"
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description *
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
              Offer Type *
            </label>
            <select
              title="Select offer type"
              value={formData.offer_type}
              onChange={(e) =>
                setFormData({ ...formData, offer_type: e.target.value as OfferType })
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
            label="Bonus Amount ($) *"
            type="number"
            value={formData.bonus_amount}
            onChange={(e) =>
              setFormData({ ...formData, bonus_amount: e.target.value })
            }
            placeholder="e.g., 50"
          />
          <Input
            label="Requirement Description"
            value={formData.requirement_description}
            onChange={(e) =>
              setFormData({ ...formData, requirement_description: e.target.value })
            }
            placeholder="e.g., Verify your email address"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Total Claims"
              type="number"
              value={formData.max_claims}
              onChange={(e) =>
                setFormData({ ...formData, max_claims: e.target.value })
              }
              placeholder="Leave empty for unlimited"
            />
            <Input
              label="Max Claims Per Player"
              type="number"
              value={formData.max_claims_per_player}
              onChange={(e) =>
                setFormData({ ...formData, max_claims_per_player: e.target.value })
              }
              placeholder="Default: 1"
            />
          </div>
          <Input
            label="End Date (optional)"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />
          <div className="flex gap-3 pt-4">
            <Button onClick={handleCreateOffer} loading={submitting} className="flex-1">
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
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Email Verification Bonus"
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description *
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
              Offer Type *
            </label>
            <select
              title="Select offer type"
              value={formData.offer_type}
              onChange={(e) =>
                setFormData({ ...formData, offer_type: e.target.value as OfferType })
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
            label="Bonus Amount ($) *"
            type="number"
            value={formData.bonus_amount}
            onChange={(e) =>
              setFormData({ ...formData, bonus_amount: e.target.value })
            }
            placeholder="e.g., 50"
          />
          <Input
            label="Requirement Description"
            value={formData.requirement_description}
            onChange={(e) =>
              setFormData({ ...formData, requirement_description: e.target.value })
            }
            placeholder="e.g., Verify your email address"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Total Claims"
              type="number"
              value={formData.max_claims}
              onChange={(e) =>
                setFormData({ ...formData, max_claims: e.target.value })
              }
              placeholder="Leave empty for unlimited"
            />
            <Input
              label="Max Claims Per Player"
              type="number"
              value={formData.max_claims_per_player}
              onChange={(e) =>
                setFormData({ ...formData, max_claims_per_player: e.target.value })
              }
              placeholder="Default: 1"
            />
          </div>
          <Input
            label="End Date (optional)"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />
          <div className="flex gap-3 pt-4">
            <Button onClick={handleUpdateOffer} loading={submitting} className="flex-1">
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
