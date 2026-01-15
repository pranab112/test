import { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { StatCard } from '@/components/common/StatCard';
import { apiClient } from '@/api/client';
import toast from 'react-hot-toast';
import {
  MdCardGiftcard,
  MdAdd,
  MdEdit,
  MdCancel,
  MdPeople,
  MdHourglassEmpty,
  MdCheckCircle,
  MdWarning,
} from 'react-icons/md';

type PromotionType = 'gc_bonus';  // Game Credits bonus - the only promotion type

interface Promotion {
  id: number;
  title: string;
  description: string;
  promotion_type: PromotionType;
  value: number;
  status: 'active' | 'expired' | 'depleted' | 'cancelled';
  start_date: string;
  end_date: string;
  claims_count: number;
  max_claims_per_player: number;
  total_budget?: number;
  used_budget: number;
  min_player_level: number;
  terms?: string;
  wagering_requirement: number;
}

interface PendingClaim {
  claim_id: number;
  promotion_id: number;
  promotion_title: string;
  promotion_type: string;
  value: number;
  player_id: number;
  player_username: string;
  player_level: number;
  player_avatar?: string;
  claimed_at: string;
  message_id?: number;
}

export function PromotionsSection() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'all'>('active');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    promotion_type: 'gc_bonus' as PromotionType,
    value: '',
    end_date: '',
    max_claims_per_player: '1',
    total_budget: '',
    min_player_level: '1',
    terms: '',
    wagering_requirement: '1',
  });

  // Cancel confirmation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingCancelPromotion, setPendingCancelPromotion] = useState<{ id: number; title: string } | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      const [promoResponse, pendingResponse] = await Promise.all([
        apiClient.get('/promotions/my-promotions'),
        apiClient.get('/promotions/pending-approvals'),
      ]);
      setPromotions(promoResponse as unknown as Promotion[]);
      setPendingClaims(pendingResponse as unknown as PendingClaim[]);
    } catch (error) {
      console.error('Failed to fetch promotions:', error);
      toast.error('Failed to load promotions');
    } finally {
      setDataLoading(false);
    }
  };

  const filteredPromotions = promotions.filter((promo) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return false; // Pending tab shows claims, not promotions
    return promo.status === activeTab;
  });

  const stats = {
    active: promotions.filter((p) => p.status === 'active').length,
    totalClaims: promotions.reduce((sum, p) => sum + p.claims_count, 0),
    creditsUsed: promotions.reduce((sum, p) => sum + p.used_budget, 0),
    pendingApprovals: pendingClaims.length,
  };

  const handleCreatePromotion = async () => {
    if (!formData.title || !formData.value || !formData.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/promotions/create', {
        title: formData.title,
        description: formData.description,
        promotion_type: formData.promotion_type,
        value: parseInt(formData.value),
        end_date: formData.end_date,
        max_claims_per_player: parseInt(formData.max_claims_per_player) || 1,
        total_budget: formData.total_budget ? parseInt(formData.total_budget) : null,
        min_player_level: parseInt(formData.min_player_level) || 1,
        terms: formData.terms || null,
        wagering_requirement: parseInt(formData.wagering_requirement) || 1,
      });
      toast.success('Promotion created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create promotion');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPromotion = async () => {
    if (!selectedPromotion) return;

    setLoading(true);
    try {
      await apiClient.put(`/promotions/${selectedPromotion.id}/update`, {
        title: formData.title,
        description: formData.description,
        value: parseInt(formData.value),
        max_claims_per_player: parseInt(formData.max_claims_per_player) || 1,
        total_budget: formData.total_budget ? parseInt(formData.total_budget) : null,
        min_player_level: parseInt(formData.min_player_level) || 1,
        end_date: formData.end_date,
        terms: formData.terms || null,
        wagering_requirement: parseInt(formData.wagering_requirement) || 1,
      });
      toast.success('Promotion updated successfully');
      setShowEditModal(false);
      setSelectedPromotion(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update promotion');
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
      await apiClient.put(`/promotions/${pendingCancelPromotion.id}/cancel`);
      toast.success('Promotion cancelled');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to cancel promotion');
      console.error(error);
    } finally {
      setShowCancelModal(false);
      setPendingCancelPromotion(null);
    }
  };

  const handleApproveClaim = async (claimId: number) => {
    try {
      await apiClient.post(`/promotions/approve-claim/${claimId}`);
      toast.success('Claim approved');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to approve claim');
    }
  };

  const handleRejectClaim = async (claimId: number) => {
    try {
      await apiClient.post(`/promotions/reject-claim/${claimId}`, { reason: '' });
      toast.success('Claim rejected');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to reject claim');
    }
  };

  const openEditModal = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setFormData({
      title: promotion.title,
      description: promotion.description,
      promotion_type: promotion.promotion_type,
      value: promotion.value.toString(),
      end_date: promotion.end_date.split('T')[0],
      max_claims_per_player: promotion.max_claims_per_player.toString(),
      total_budget: promotion.total_budget?.toString() || '',
      min_player_level: promotion.min_player_level.toString(),
      terms: promotion.terms || '',
      wagering_requirement: promotion.wagering_requirement.toString(),
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      promotion_type: 'gc_bonus',
      value: '',
      end_date: '',
      max_claims_per_player: '1',
      total_budget: '',
      min_player_level: '1',
      terms: '',
      wagering_requirement: '1',
    });
  };

  const getProgressPercentage = (current: number, total: number) => {
    if (!total) return 0;
    return Math.min((current / total) * 100, 100);
  };

  const promotionTypeColors: Record<string, string> = {
    gc_bonus: 'bg-emerald-600',
  };

  const getPromotionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      gc_bonus: 'GC Bonus',
    };
    return labels[type] || 'GC Bonus';
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-emerald-500 mb-2">Promotions</h1>
          <p className="text-gray-400">Create and manage your promotional offers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-dark-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <MdAdd size={20} />
          Create Promotion
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Promotions"
          value={stats.active}
          icon={<MdCardGiftcard />}
          color="green"
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          icon={<MdHourglassEmpty />}
          color="warning"
        />
        <StatCard
          title="Total Claims"
          value={stats.totalClaims}
          icon={<MdPeople />}
          color="blue"
        />
        <StatCard
          title="GC Used"
          value={`${stats.creditsUsed.toLocaleString()} GC`}
          icon={<MdCardGiftcard />}
          color="green"
        />
      </div>

      {/* Pending Claims Alert */}
      {pendingClaims.length > 0 && (
        <div className="bg-yellow-900/30 border-2 border-yellow-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <MdHourglassEmpty className="text-2xl text-yellow-500 animate-pulse" />
            <div className="flex-1">
              <p className="text-yellow-400 font-bold">
                {pendingClaims.length} claim{pendingClaims.length > 1 ? 's' : ''} waiting for approval
              </p>
              <p className="text-sm text-gray-400">
                Review and approve player promotion claims
              </p>
            </div>
            <button
              onClick={() => setActiveTab('pending')}
              className="bg-yellow-600 hover:bg-yellow-700 text-dark-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Review Claims
            </button>
          </div>
        </div>
      )}

      {/* Tab Filters */}
      <div className="flex gap-2 border-b border-emerald-700">
        {(['active', 'pending', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium capitalize transition-colors relative ${
              activeTab === tab
                ? 'text-emerald-500 border-b-2 border-emerald-500'
                : 'text-gray-400 hover:text-emerald-500'
            }`}
          >
            {tab === 'pending' ? 'Pending Approvals' : tab}
            {tab === 'pending' && pendingClaims.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-dark-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingClaims.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      <div className="space-y-4">
        {activeTab === 'pending' ? (
          // Pending Claims List
          pendingClaims.length === 0 ? (
            <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-12 text-center">
              <MdCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
              <p className="text-gray-400">No pending claims to review</p>
            </div>
          ) : (
            pendingClaims.map((claim) => (
              <div
                key={claim.claim_id}
                className="bg-dark-200 border-2 border-yellow-500 rounded-lg p-6 hover:shadow-green transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{claim.promotion_title}</h3>
                      <Badge variant="warning">Pending Approval</Badge>
                      <Badge variant="info">{getPromotionTypeLabel(claim.promotion_type)}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>
                        Player: <span className="text-white font-medium">{claim.player_username}</span>
                      </span>
                      <span>
                        Level: <span className="text-white font-medium">{claim.player_level}</span>
                      </span>
                      <span>
                        Value: <span className="text-emerald-500 font-bold">{claim.value} GC</span>
                      </span>
                      <span>
                        Claimed: <span className="text-white">{new Date(claim.claimed_at).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveClaim(claim.claim_id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      <MdCheckCircle size={16} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectClaim(claim.claim_id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      <MdCancel size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          // Promotions List
          filteredPromotions.length === 0 ? (
            <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-12 text-center">
              <MdCardGiftcard className="text-6xl text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No promotions found</p>
            </div>
          ) : (
            filteredPromotions.map((promo) => (
              <div
                key={promo.id}
                className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-6 hover:shadow-green transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{promo.title}</h3>
                      <Badge
                        variant={
                          promo.status === 'active'
                            ? 'success'
                            : promo.status === 'expired'
                            ? 'default'
                            : 'error'
                        }
                        dot={promo.status === 'active'}
                      >
                        {promo.status.toUpperCase()}
                      </Badge>
                      <Badge variant="info">{getPromotionTypeLabel(promo.promotion_type)}</Badge>
                    </div>
                    <p className="text-gray-400">{promo.description}</p>
                  </div>
                  {promo.status === 'active' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(promo)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                      >
                        <MdEdit size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleCancelPromotion(promo.id, promo.title)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                      >
                        <MdCancel size={16} />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Value</p>
                    <p className="text-white font-bold">{promo.value} GC</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Claims</p>
                    <p className="text-white font-bold">{promo.claims_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Min Level</p>
                    <p className="text-white font-bold">Level {promo.min_player_level}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">End Date</p>
                    <p className="text-white font-bold">
                      {new Date(promo.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                {promo.total_budget && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">GC Used</span>
                      <span className="text-white font-medium">
                        {promo.used_budget.toLocaleString()} / {promo.total_budget.toLocaleString()} GC
                      </span>
                    </div>
                    <div className="w-full bg-dark-400 rounded-full h-2">
                      <div
                        className={`${promotionTypeColors[promo.promotion_type] || 'bg-emerald-600'} h-2 rounded-full transition-all`}
                        style={{
                          width: `${getProgressPercentage(promo.used_budget, promo.total_budget)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )
        )}
      </div>

      {/* Create Promotion Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create New Promotion"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Promotion Title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter promotion title..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter promotion description..."
              rows={3}
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Promotion Type</label>
            <div className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg border border-emerald-600">
              <span className="text-emerald-500 font-medium">GC Bonus</span>
              <span className="text-gray-400 ml-2">(Game Credits)</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Value (GC)"
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="Enter GC amount..."
            />
            <Input
              label="Max Claims Per Player"
              type="number"
              value={formData.max_claims_per_player}
              onChange={(e) => setFormData({ ...formData, max_claims_per_player: e.target.value })}
              placeholder="1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
            <Input
              label="Total Budget (GC)"
              type="number"
              value={formData.total_budget}
              onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
              placeholder="Leave empty for unlimited"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum Player Level"
              type="number"
              value={formData.min_player_level}
              onChange={(e) => setFormData({ ...formData, min_player_level: e.target.value })}
              placeholder="1"
            />
            <Input
              label="Wagering Requirement (multiplier)"
              type="number"
              value={formData.wagering_requirement}
              onChange={(e) => setFormData({ ...formData, wagering_requirement: e.target.value })}
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Terms & Conditions (optional)</label>
            <textarea
              value={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              placeholder="Enter terms and conditions..."
              rows={2}
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-3 space-y-2">
            <p className="text-sm text-blue-300">
              <strong>Note:</strong> This is a manual promotion. When players claim it, you will need to approve/reject
              their claims. GC will be deducted from your balance when you approve claims.
            </p>
            <p className="text-sm text-yellow-300">
              <strong>Budget:</strong> If left empty, budget will be set to your current GC balance. Budget cannot exceed your GC.
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePromotion} loading={loading} fullWidth>
              Create Promotion
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Promotion Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPromotion(null);
          resetForm();
        }}
        title="Edit Promotion"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Promotion Title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Value (GC)"
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            />
            <Input
              label="Max Claims Per Player"
              type="number"
              value={formData.max_claims_per_player}
              onChange={(e) => setFormData({ ...formData, max_claims_per_player: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
            <Input
              label="Total Budget (GC)"
              type="number"
              value={formData.total_budget}
              onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
              placeholder="Leave empty to use your GC"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum Player Level"
              type="number"
              value={formData.min_player_level}
              onChange={(e) => setFormData({ ...formData, min_player_level: e.target.value })}
              placeholder="1"
            />
            <Input
              label="Wagering Requirement (multiplier)"
              type="number"
              value={formData.wagering_requirement}
              onChange={(e) => setFormData({ ...formData, wagering_requirement: e.target.value })}
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Terms & Conditions (optional)</label>
            <textarea
              value={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              placeholder="Enter terms and conditions..."
              rows={2}
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-3">
            <p className="text-sm text-yellow-300">
              <strong>Note:</strong> Budget will be capped to your current GC balance. GC will be deducted when claims are approved.
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                setSelectedPromotion(null);
                resetForm();
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button onClick={handleEditPromotion} loading={loading} fullWidth>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

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
              This will prevent any more claims.
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
