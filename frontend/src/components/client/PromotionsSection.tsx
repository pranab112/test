import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { StatCard } from '@/components/common/StatCard';
import toast from 'react-hot-toast';
import {
  MdCardGiftcard,
  MdAdd,
  MdEdit,
  MdCancel,
  MdTrendingUp,
  MdPeople,
  MdAttachMoney,
} from 'react-icons/md';

interface Promotion {
  id: number;
  title: string;
  description: string;
  promotionType: 'credits' | 'bonus' | 'cashback' | 'free_spins';
  value: number;
  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  totalClaims: number;
  maxClaims: number;
  creditsUsed: number;
  creditsTotal: number;
}

export function PromotionsSection() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'expired' | 'all'>('active');
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    promotionType: 'credits' as Promotion['promotionType'],
    value: '',
    endDate: '',
    maxClaims: '',
    creditsTotal: '',
  });

  // TODO: Replace with API call
  const mockPromotions: Promotion[] = [
    {
      id: 1,
      title: 'Welcome Bonus - 100 Credits',
      description: 'Get 100 free credits when you sign up!',
      promotionType: 'credits',
      value: 100,
      status: 'active',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      totalClaims: 45,
      maxClaims: 100,
      creditsUsed: 4500,
      creditsTotal: 10000,
    },
    {
      id: 2,
      title: 'Weekend Bonus - 50% Extra',
      description: '50% bonus on all deposits this weekend',
      promotionType: 'bonus',
      value: 50,
      status: 'active',
      startDate: '2025-12-20',
      endDate: '2025-12-26',
      totalClaims: 23,
      maxClaims: 50,
      creditsUsed: 2300,
      creditsTotal: 5000,
    },
    {
      id: 3,
      title: 'Holiday Special - Free Spins',
      description: '20 free spins on selected games',
      promotionType: 'free_spins',
      value: 20,
      status: 'active',
      startDate: '2025-12-15',
      endDate: '2025-12-30',
      totalClaims: 67,
      maxClaims: 200,
      creditsUsed: 1340,
      creditsTotal: 4000,
    },
    {
      id: 4,
      title: 'Black Friday Cashback',
      description: '10% cashback on all losses',
      promotionType: 'cashback',
      value: 10,
      status: 'expired',
      startDate: '2025-11-25',
      endDate: '2025-11-30',
      totalClaims: 89,
      maxClaims: 100,
      creditsUsed: 8900,
      creditsTotal: 10000,
    },
  ];

  const [promotions, setPromotions] = useState(mockPromotions);

  const filteredPromotions = promotions.filter((promo) => {
    if (activeTab === 'all') return true;
    return promo.status === activeTab;
  });

  const stats = {
    active: promotions.filter((p) => p.status === 'active').length,
    totalClaims: promotions.reduce((sum, p) => sum + p.totalClaims, 0),
    creditsUsed: promotions.reduce((sum, p) => sum + p.creditsUsed, 0),
    claimRate: (
      (promotions.reduce((sum, p) => sum + p.totalClaims, 0) /
        promotions.reduce((sum, p) => sum + p.maxClaims, 0)) *
      100
    ).toFixed(1),
  };

  const handleCreatePromotion = async () => {
    if (!formData.title || !formData.value || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await clientApi.createPromotion(formData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Promotion created successfully');
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create promotion');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPromotion = async () => {
    if (!selectedPromotion) return;

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await clientApi.updatePromotion(selectedPromotion.id, formData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success('Promotion updated successfully');
      setShowEditModal(false);
      setSelectedPromotion(null);
      resetForm();
    } catch (error) {
      toast.error('Failed to update promotion');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPromotion = async (promotionId: number, title: string) => {
    if (!confirm(`Cancel the promotion "${title}"?`)) {
      return;
    }

    try {
      // TODO: Replace with actual API call
      // await clientApi.cancelPromotion(promotionId);
      await new Promise((resolve) => setTimeout(resolve, 300));
      toast.success('Promotion cancelled');
      setPromotions((prev) =>
        prev.map((p) => (p.id === promotionId ? { ...p, status: 'cancelled' as const } : p))
      );
    } catch (error) {
      toast.error('Failed to cancel promotion');
      console.error(error);
    }
  };

  const openEditModal = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setFormData({
      title: promotion.title,
      description: promotion.description,
      promotionType: promotion.promotionType,
      value: promotion.value.toString(),
      endDate: promotion.endDate,
      maxClaims: promotion.maxClaims.toString(),
      creditsTotal: promotion.creditsTotal.toString(),
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      promotionType: 'credits',
      value: '',
      endDate: '',
      maxClaims: '',
      creditsTotal: '',
    });
  };

  const getProgressPercentage = (current: number, total: number) => {
    return Math.min((current / total) * 100, 100);
  };

  const promotionTypeColors = {
    credits: 'bg-blue-600',
    bonus: 'bg-green-600',
    cashback: 'bg-purple-600',
    free_spins: 'bg-gold-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Promotions</h1>
          <p className="text-gray-400">Create and manage your promotional offers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gold-600 hover:bg-gold-700 text-dark-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
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
          color="gold"
        />
        <StatCard
          title="Total Claims"
          value={stats.totalClaims}
          icon={<MdPeople />}
          color="blue"
        />
        <StatCard
          title="Credits Used"
          value={stats.creditsUsed.toLocaleString()}
          icon={<MdAttachMoney />}
          color="green"
        />
        <StatCard
          title="Claim Rate"
          value={`${stats.claimRate}%`}
          icon={<MdTrendingUp />}
          color="purple"
        />
      </div>

      {/* Tab Filters */}
      <div className="flex gap-2 border-b border-gold-700">
        {(['active', 'expired', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-gold-500 border-b-2 border-gold-500'
                : 'text-gray-400 hover:text-gold-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Promotions List */}
      <div className="space-y-4">
        {filteredPromotions.length === 0 ? (
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
            <MdCardGiftcard className="text-6xl text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No promotions found</p>
          </div>
        ) : (
          filteredPromotions.map((promo) => (
            <div
              key={promo.id}
              className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6 hover:shadow-gold transition-all"
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
                    <Badge variant="info">{promo.promotionType.replace('_', ' ').toUpperCase()}</Badge>
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

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Value</p>
                  <p className="text-white font-bold">{promo.value}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Claims</p>
                  <p className="text-white font-bold">
                    {promo.totalClaims} / {promo.maxClaims}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">End Date</p>
                  <p className="text-white font-bold">
                    {new Date(promo.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Claims Progress</span>
                    <span className="text-white font-medium">
                      {getProgressPercentage(promo.totalClaims, promo.maxClaims).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-dark-400 rounded-full h-2">
                    <div
                      className="bg-gold-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${getProgressPercentage(promo.totalClaims, promo.maxClaims)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Credits Used</span>
                    <span className="text-white font-medium">
                      {promo.creditsUsed.toLocaleString()} / {promo.creditsTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-dark-400 rounded-full h-2">
                    <div
                      className={`${promotionTypeColors[promo.promotionType]} h-2 rounded-full transition-all`}
                      style={{
                        width: `${getProgressPercentage(promo.creditsUsed, promo.creditsTotal)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
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
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Promotion Type</label>
            <select
              value={formData.promotionType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  promotionType: e.target.value as Promotion['promotionType'],
                })
              }
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="credits">Credits</option>
              <option value="bonus">Bonus</option>
              <option value="cashback">Cashback</option>
              <option value="free_spins">Free Spins</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Value"
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="Enter value..."
            />
            <Input
              label="Max Claims"
              type="number"
              value={formData.maxClaims}
              onChange={(e) => setFormData({ ...formData, maxClaims: e.target.value })}
              placeholder="Enter max claims..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
            <Input
              label="Total Credits"
              type="number"
              value={formData.creditsTotal}
              onChange={(e) => setFormData({ ...formData, creditsTotal: e.target.value })}
              placeholder="Enter total credits..."
            />
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
              className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Value"
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            />
            <Input
              label="Max Claims"
              type="number"
              value={formData.maxClaims}
              onChange={(e) => setFormData({ ...formData, maxClaims: e.target.value })}
            />
          </div>
          <Input
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
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
    </div>
  );
}
