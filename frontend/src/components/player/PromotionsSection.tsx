import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { apiClient } from '@/api/client';
import toast from 'react-hot-toast';
import { MdCardGiftcard, MdCheckCircle, MdHourglassEmpty } from 'react-icons/md';

interface Promotion {
  id: number;
  title: string;
  description: string;
  client_name: string;
  client_company?: string;
  client_id: number;
  promotion_type: 'bonus' | 'cashback' | 'credits' | 'free_spins' | 'deposit_bonus' | 'game_points' | 'replay' | 'next_load_bonus';
  value: number;
  can_claim: boolean;
  already_claimed: boolean;
  status: string;
  start_date: string;
  end_date: string;
  terms?: string;
  wagering_requirement: number;
  min_player_level: number;
}

interface Claim {
  id?: number;
  claim_id: number;
  promotion_title: string;
  promotion_type: string;
  client_name: string;
  client_company?: string;
  claimed_value: number;
  status: 'pending_approval' | 'approved' | 'rejected' | 'claimed' | 'used' | 'expired';
  claimed_at: string;
  wagering_completed: number;
  wagering_required: number;
}

export function PromotionsSection() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'pending' | 'claimed'>('all');

  // Fetch promotions and claims
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [promoResponse, claimsResponse] = await Promise.all([
          apiClient.get('/promotions/available'),
          apiClient.get('/promotions/my-claims'),
        ]);
        setPromotions(promoResponse as unknown as Promotion[]);
        const claimsData = claimsResponse as unknown as Claim[];
        setClaims(claimsData.map(c => ({ ...c, id: c.claim_id })));
      } catch (error) {
        console.error('Failed to fetch promotions:', error);
        toast.error('Failed to load promotions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleViewDetails = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setShowDetailsModal(true);
  };

  const handleClaimPromotion = async (promotion: Promotion) => {
    setClaiming(true);
    try {
      const response = await apiClient.post('/promotions/claim', {
        promotion_id: promotion.id,
      }) as { success: boolean; message: string; claim_id?: number; status?: string };

      if (response.success) {
        if (response.status === 'pending_approval') {
          toast.success('Claim request sent! Waiting for client approval.', {
            duration: 5000,
            icon: '⏳',
          });
        } else {
          toast.success(response.message);
        }

        // Refresh data
        const [promoResponse, claimsResponse] = await Promise.all([
          apiClient.get('/promotions/available'),
          apiClient.get('/promotions/my-claims'),
        ]);
        setPromotions(promoResponse as unknown as Promotion[]);
        const claimsData = claimsResponse as unknown as Claim[];
        setClaims(claimsData.map(c => ({ ...c, id: c.claim_id })));
        setShowDetailsModal(false);
      } else {
        toast.error(response.message);
      }
    } catch (error: any) {
      console.error('Promotion claim error:', error);
      toast.error(error.detail || error.message || 'Failed to claim promotion');
    } finally {
      setClaiming(false);
    }
  };

  const getTypeColor = (type: string): 'success' | 'purple' | 'warning' | 'info' | 'default' => {
    switch (type) {
      case 'bonus': return 'success';
      case 'cashback': return 'purple';
      case 'credits': return 'warning';
      case 'free_spins': return 'info';
      case 'deposit_bonus': return 'success';
      case 'game_points': return 'info';
      case 'replay': return 'purple';
      case 'next_load_bonus': return 'success';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bonus': return 'Bonus';
      case 'cashback': return 'Cashback';
      case 'credits': return 'Credits';
      case 'free_spins': return 'Free Spins';
      case 'deposit_bonus': return 'Deposit Bonus';
      case 'game_points': return 'Game Points';
      case 'replay': return 'Replay';
      case 'next_load_bonus': return 'Next Load Bonus';
      default: return type;
    }
  };

  const getStatusBadge = (claim: Claim) => {
    switch (claim.status) {
      case 'pending_approval':
        return <Badge variant="warning">Pending Approval</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="error">Rejected</Badge>;
      case 'claimed':
        return <Badge variant="default">Claimed</Badge>;
      case 'used':
        return <Badge variant="info">Used</Badge>;
      case 'expired':
        return <Badge variant="error">Expired</Badge>;
      default:
        return <Badge variant="default">{claim.status}</Badge>;
    }
  };

  const pendingClaims = claims.filter((c) => c.status === 'pending_approval');
  const approvedClaims = claims.filter((c) => c.status === 'approved' || c.status === 'claimed');

  const filteredPromotions = promotions.filter((promo) => {
    if (filter === 'all') return true;
    if (filter === 'available') return promo.can_claim;
    return false;
  });

  const promotionColumns = [
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
        <span className="text-gray-300">{promo.client_company || promo.client_name}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (promo: Promotion) => (
        <Badge variant={getTypeColor(promo.promotion_type)}>
          {getTypeLabel(promo.promotion_type)}
        </Badge>
      ),
    },
    {
      key: 'value',
      label: 'Value',
      render: (promo: Promotion) => (
        <span className="font-bold text-gold-500">
          {promo.promotion_type === 'cashback' ? `${promo.value}%` : `$${promo.value}`}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (promo: Promotion) => {
        if (promo.already_claimed) {
          return <Badge variant="default">Claimed</Badge>;
        }
        if (promo.can_claim) {
          return <Badge variant="success">Available</Badge>;
        }
        return <Badge variant="error">Unavailable</Badge>;
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
            type="button"
            onClick={() => handleViewDetails(promo)}
            className="text-blue-500 hover:text-blue-400 text-sm font-medium"
          >
            Details
          </button>
          {promo.can_claim && !promo.already_claimed && (
            <button
              type="button"
              onClick={() => {
                setSelectedPromotion(promo);
                handleClaimPromotion(promo);
              }}
              className="bg-gold-gradient text-dark-700 font-bold px-3 py-1 rounded text-sm hover:shadow-gold transition-all"
            >
              Claim
            </button>
          )}
          {promo.already_claimed && (
            <span className="text-gray-500 text-sm flex items-center gap-1">
              <MdCheckCircle className="text-green-500" />
              Claimed
            </span>
          )}
        </div>
      ),
    },
  ];

  const claimColumns = [
    {
      key: 'promotion_title',
      label: 'Promotion',
      width: '25%',
      render: (claim: Claim) => (
        <div>
          <div className="font-medium text-white">{claim.promotion_title}</div>
          <div className="text-xs text-gray-400 mt-1">{claim.client_company || claim.client_name}</div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (claim: Claim) => (
        <Badge variant={getTypeColor(claim.promotion_type)}>
          {getTypeLabel(claim.promotion_type)}
        </Badge>
      ),
    },
    {
      key: 'value',
      label: 'Value',
      render: (claim: Claim) => (
        <span className="font-bold text-gold-500">${claim.claimed_value}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (claim: Claim) => getStatusBadge(claim),
    },
    {
      key: 'claimed_at',
      label: 'Claimed',
      render: (claim: Claim) => (
        <span className="text-sm text-gray-400">
          {new Date(claim.claimed_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'wagering',
      label: 'Wagering',
      render: (claim: Claim) => (
        claim.wagering_required > 0 ? (
          <div className="text-sm">
            <div className="text-gray-400">
              {claim.wagering_completed} / {claim.wagering_required}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
              <div
                className="bg-gold-500 h-1 rounded-full"
                style={{ width: `${Math.min(100, (claim.wagering_completed / claim.wagering_required) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-gray-500">N/A</span>
        )
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Promotions</h1>
          <p className="text-gray-400">Available promotions from your clients</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            All ({promotions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('available')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'available'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Available ({promotions.filter((p) => p.can_claim).length})
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-2 border-green-700 rounded-lg p-6">
          <MdCardGiftcard className="text-4xl text-green-500 mb-2" />
          <p className="text-2xl font-bold text-white">
            {promotions.filter((p) => p.can_claim).length}
          </p>
          <p className="text-sm text-green-400">Available Promotions</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border-2 border-yellow-700 rounded-lg p-6">
          <MdHourglassEmpty className="text-4xl text-yellow-500 mb-2" />
          <p className="text-2xl font-bold text-white">{pendingClaims.length}</p>
          <p className="text-sm text-yellow-400">Pending Approval</p>
        </div>

        <div className="bg-gradient-to-br from-gold-900/30 to-yellow-800/20 border-2 border-gold-700 rounded-lg p-6">
          <MdCheckCircle className="text-4xl text-gold-500 mb-2" />
          <p className="text-2xl font-bold text-white">{approvedClaims.length}</p>
          <p className="text-sm text-gold-400">Approved Claims</p>
        </div>

        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-2 border-purple-700 rounded-lg p-6">
          <MdCardGiftcard className="text-4xl text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-white">
            ${approvedClaims.reduce((sum, c) => sum + c.claimed_value, 0)}
          </p>
          <p className="text-sm text-purple-400">Total Value Claimed</p>
        </div>
      </div>

      {/* Pending Claims Alert */}
      {pendingClaims.length > 0 && (
        <div className="bg-yellow-900/30 border-2 border-yellow-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <MdHourglassEmpty className="text-2xl text-yellow-500 animate-pulse" />
            <div>
              <p className="text-yellow-400 font-bold">
                {pendingClaims.length} claim{pendingClaims.length > 1 ? 's' : ''} pending approval
              </p>
              <p className="text-sm text-gray-400">
                Waiting for clients to approve your promotion claims
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Available Promotions Table */}
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Available Promotions</h2>
        <DataTable
          data={filteredPromotions}
          columns={promotionColumns}
          emptyMessage="No promotions available"
        />
      </div>

      {/* My Claims Table */}
      {claims.length > 0 && (
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">My Claims</h2>
          <DataTable
            data={claims}
            columns={claimColumns}
            emptyMessage="No claims yet"
          />
        </div>
      )}

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
                <Badge variant={getTypeColor(selectedPromotion.promotion_type)} size="lg">
                  {getTypeLabel(selectedPromotion.promotion_type)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Client</p>
                  <p className="font-medium text-white">
                    {selectedPromotion.client_company || selectedPromotion.client_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Value</p>
                  <p className="font-bold text-gold-500 text-xl">
                    {selectedPromotion.promotion_type === 'cashback'
                      ? `${selectedPromotion.value}%`
                      : `$${selectedPromotion.value}`}
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
                <div>
                  <p className="text-sm text-gray-400 mb-1">Min Level</p>
                  <p className="text-white">Level {selectedPromotion.min_player_level}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Wagering Req.</p>
                  <p className="text-white">{selectedPromotion.wagering_requirement}x</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Status</p>
                {selectedPromotion.can_claim && !selectedPromotion.already_claimed ? (
                  <Badge variant="success">Available to Claim</Badge>
                ) : selectedPromotion.already_claimed ? (
                  <Badge variant="default">Already Claimed</Badge>
                ) : (
                  <Badge variant="error">Unavailable</Badge>
                )}
              </div>
            </div>

            {selectedPromotion.terms && (
              <div className="bg-dark-300 rounded-lg p-4">
                <h4 className="font-bold text-gold-500 mb-2">Terms & Conditions</h4>
                <p className="text-sm text-gray-300">{selectedPromotion.terms}</p>
              </div>
            )}

            {/* Info about approval process */}
            {selectedPromotion.can_claim && !selectedPromotion.already_claimed && (
              <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  <strong>Note:</strong> When you claim this promotion, a request will be sent to the
                  client for approval. You will receive a notification once they respond.
                </p>
              </div>
            )}

            {selectedPromotion.can_claim && !selectedPromotion.already_claimed && (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleClaimPromotion(selectedPromotion)}
                  loading={claiming}
                  variant="primary"
                  fullWidth
                >
                  Request Claim
                </Button>
                <Button onClick={() => setShowDetailsModal(false)} variant="secondary">
                  Cancel
                </Button>
              </div>
            )}

            {selectedPromotion.already_claimed && (
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
