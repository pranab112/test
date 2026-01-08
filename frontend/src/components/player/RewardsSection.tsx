import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import toast from 'react-hot-toast';
import { FaGift, FaMedal } from 'react-icons/fa';
import { MdCheckCircle, MdRefresh, MdEmail, MdPerson, MdPayment, MdGroup, MdEvent } from 'react-icons/md';
import { offersApi, type PlatformOffer, type OfferClaim, type OfferType, type BalanceResponse } from '@/api/endpoints/offers.api';
import { friendsApi, type Friend } from '@/api/endpoints/friends.api';
import { Input } from '@/components/common/Input';
import { FaPaperPlane, FaWallet } from 'react-icons/fa';

export function RewardsSection() {
  const [loading, setLoading] = useState(true);
  const [availableOffers, setAvailableOffers] = useState<PlatformOffer[]>([]);
  const [myClaims, setMyClaims] = useState<OfferClaim[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<PlatformOffer | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'claimed'>('all');

  // For claiming - client is now optional (admin approves)
  const [clients, setClients] = useState<Friend[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [loadingClients, setLoadingClients] = useState(false);

  // Credit balance and transfer
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [offersData, claimsData, balanceData] = await Promise.all([
        offersApi.getAvailableOffers(),
        offersApi.getMyClaims(),
        offersApi.getMyBalance(),
      ]);
      setAvailableOffers(offersData);
      setMyClaims(claimsData);
      setBalance(balanceData);
    } catch (error) {
      console.error('Failed to load rewards data:', error);
      toast.error('Failed to load rewards');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const friends = await friendsApi.getFriends();
      // Filter to get only clients
      const clientFriends = friends.filter(f => f.user_type === 'client');
      setClients(clientFriends);
    } catch (error) {
      console.error('Failed to load clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  };

  const handleViewDetails = (offer: PlatformOffer) => {
    setSelectedOffer(offer);
    setShowDetailsModal(true);
  };

  const handleStartClaim = async (offer: PlatformOffer) => {
    setSelectedOffer(offer);
    setSelectedClientId(null);
    await loadClients();
    setShowClaimModal(true);
  };

  const handleClaimReward = async () => {
    if (!selectedOffer) {
      toast.error('No offer selected');
      return;
    }

    setClaiming(true);
    try {
      await offersApi.claimOffer({
        offer_id: selectedOffer.id,
        client_id: selectedClientId || undefined,  // Optional now
      });
      toast.success(`Claim request sent for "${selectedOffer.title}"! Admin will review your request.`);
      setShowClaimModal(false);
      setShowDetailsModal(false);
      setSelectedClientId(null);
      await loadData();
    } catch (error: any) {
      console.error('Offer claim error:', error);
      toast.error(error.detail || error.message || 'Failed to claim reward');
    } finally {
      setClaiming(false);
    }
  };

  // Credit transfer function
  const handleTransferCredits = async () => {
    if (!selectedClientId) {
      toast.error('Please select a client to transfer to');
      return;
    }
    const amount = parseInt(transferAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (balance && amount > balance.credits) {
      toast.error('Insufficient credits');
      return;
    }

    setTransferring(true);
    try {
      const result = await offersApi.transferCredits({
        client_id: selectedClientId,
        amount: amount,
      });
      toast.success(`Transferred ${result.credits_transferred} credits ($${result.dollar_value}) successfully!`);
      setShowTransferModal(false);
      setTransferAmount('');
      setSelectedClientId(null);
      await loadData();  // Refresh balance
    } catch (error: any) {
      toast.error(error.detail || 'Failed to transfer credits');
    } finally {
      setTransferring(false);
    }
  };

  const openTransferModal = async () => {
    setSelectedClientId(null);
    setTransferAmount('');
    await loadClients();
    setShowTransferModal(true);
  };

  const getTypeIcon = (type: OfferType) => {
    switch (type) {
      case 'email_verification':
        return <MdEmail className="text-blue-500" />;
      case 'profile_completion':
        return <MdPerson className="text-purple-500" />;
      case 'first_deposit':
        return <MdPayment className="text-green-500" />;
      case 'referral':
        return <MdGroup className="text-orange-500" />;
      case 'loyalty':
        return <FaMedal className="text-gold-500" />;
      case 'special_event':
        return <MdEvent className="text-pink-500" />;
      default:
        return <FaGift className="text-gold-500" />;
    }
  };

  const getTypeColor = (type: OfferType): 'info' | 'warning' | 'purple' | 'success' | 'error' | 'default' => {
    switch (type) {
      case 'email_verification':
        return 'info';
      case 'profile_completion':
        return 'purple';
      case 'first_deposit':
        return 'success';
      case 'referral':
        return 'warning';
      case 'loyalty':
        return 'error';
      case 'special_event':
        return 'purple';
      default:
        return 'default';
    }
  };

  const getTypeLabel = (type: OfferType) => {
    return type.replace(/_/g, ' ').toUpperCase();
  };

  const getClaimStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">PENDING</Badge>;
      case 'approved':
      case 'completed':
        return <Badge variant="success">APPROVED</Badge>;
      case 'rejected':
        return <Badge variant="error">REJECTED</Badge>;
      default:
        return <Badge variant="default">{status.toUpperCase()}</Badge>;
    }
  };

  // Combine available offers and claims for display
  const getDisplayData = () => {
    const claimedOfferIds = new Set(myClaims.map(c => c.offer_id));

    if (filter === 'available') {
      return availableOffers.map(offer => ({
        ...offer,
        displayStatus: 'available' as const,
        claim: null as OfferClaim | null,
      }));
    }

    if (filter === 'claimed') {
      return myClaims.map(claim => {
        const offer = availableOffers.find(o => o.id === claim.offer_id);
        return {
          id: claim.offer_id,
          title: claim.offer_title || 'Unknown Offer',
          description: offer?.description || '',
          offer_type: offer?.offer_type || 'special_event' as OfferType,
          bonus_amount: claim.bonus_amount,
          requirement_description: offer?.requirement_description,
          max_claims: offer?.max_claims,
          max_claims_per_player: offer?.max_claims_per_player || 1,
          status: offer?.status || 'active',
          start_date: offer?.start_date || claim.claimed_at,
          end_date: offer?.end_date,
          created_at: offer?.created_at || claim.claimed_at,
          displayStatus: 'claimed' as const,
          claim,
        };
      });
    }

    // All - combine available and claimed
    const combined = [
      ...availableOffers.map(offer => ({
        ...offer,
        displayStatus: claimedOfferIds.has(offer.id) ? 'claimed' as const : 'available' as const,
        claim: myClaims.find(c => c.offer_id === offer.id) || null,
      })),
    ];

    // Add claims for offers not in available list
    myClaims.forEach(claim => {
      if (!combined.find(o => o.id === claim.offer_id)) {
        combined.push({
          id: claim.offer_id,
          title: claim.offer_title || 'Unknown Offer',
          description: '',
          offer_type: 'special_event' as OfferType,
          bonus_amount: claim.bonus_amount,
          requirement_description: undefined,
          max_claims: undefined,
          max_claims_per_player: 1,
          status: 'active' as const,
          start_date: claim.claimed_at,
          end_date: undefined,
          created_at: claim.claimed_at,
          displayStatus: 'claimed' as const,
          claim,
        });
      }
    });

    return combined;
  };

  const displayData = getDisplayData();

  const columns = [
    {
      key: 'title',
      label: 'Reward',
      width: '30%',
      render: (item: (typeof displayData)[0]) => (
        <div className="flex items-center gap-3">
          <div className="text-2xl">
            {getTypeIcon(item.offer_type)}
          </div>
          <div>
            <div className="font-medium text-white">{item.title}</div>
            <div className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (item: (typeof displayData)[0]) => (
        <Badge variant={getTypeColor(item.offer_type)}>
          {getTypeLabel(item.offer_type)}
        </Badge>
      ),
    },
    {
      key: 'bonus',
      label: 'Bonus Amount',
      render: (item: (typeof displayData)[0]) => (
        <div className="flex items-center gap-1">
          <span className="font-bold text-gold-500 text-lg">${item.bonus_amount}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: (typeof displayData)[0]) => {
        if (item.displayStatus === 'claimed' && item.claim) {
          return getClaimStatusBadge(item.claim.status);
        }
        return <Badge variant="success">AVAILABLE</Badge>;
      },
    },
    {
      key: 'expires',
      label: 'Expires',
      render: (item: (typeof displayData)[0]) => (
        <span className="text-sm text-gray-400">
          {item.end_date
            ? new Date(item.end_date).toLocaleDateString()
            : 'No expiry'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item: (typeof displayData)[0]) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleViewDetails(item)}
            className="text-blue-500 hover:text-blue-400 text-sm font-medium"
          >
            Details
          </button>
          {item.displayStatus === 'available' && (
            <button
              type="button"
              onClick={() => handleStartClaim(item)}
              className="bg-gold-gradient text-dark-700 font-bold px-3 py-1 rounded text-sm hover:shadow-gold transition-all"
            >
              Claim
            </button>
          )}
        </div>
      ),
    },
  ];

  const availableCount = availableOffers.length;
  const claimedCount = myClaims.length;
  const totalEarned = myClaims
    .filter(c => c.status === 'approved' || c.status === 'completed')
    .reduce((sum, c) => sum + c.bonus_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-500">Loading rewards...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Platform Rewards</h1>
          <p className="text-gray-400">Claim special rewards from Golden Ace platform</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadData}
            className="bg-dark-300 hover:bg-dark-400 text-gold-500 p-3 rounded-lg transition-colors"
            title="Refresh"
          >
            <MdRefresh size={20} />
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            All
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
            Available ({availableCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('claimed')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'claimed'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Claimed ({claimedCount})
          </button>
        </div>
      </div>

      {/* Credit Balance Card */}
      <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FaWallet className="text-5xl text-green-500" />
            <div>
              <p className="text-sm text-gray-400">Your Credit Balance</p>
              <p className="text-4xl font-bold text-green-400">
                {balance?.credits.toLocaleString() || 0} credits
              </p>
              <p className="text-lg text-gray-300">
                = ${balance?.dollar_value.toFixed(2) || '0.00'} <span className="text-sm text-gray-500">({balance?.rate || '100 credits = $1'})</span>
              </p>
            </div>
          </div>
          <Button onClick={openTransferModal} className="flex items-center gap-2">
            <FaPaperPlane /> Transfer to Client
          </Button>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="bg-gradient-to-r from-gold-900/40 to-yellow-900/40 border-2 border-gold-700 rounded-lg p-6">
        <div className="flex items-center gap-6">
          <FaGift className="text-6xl text-gold-500" />
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gold-500 mb-2">Earn More Rewards!</h3>
            <p className="text-gray-300 mb-3">Complete tasks and claim offers. Admin will approve and credits will be added to your balance.</p>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-gray-400">Available</p>
                <p className="text-2xl font-bold text-green-400">{availableCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Claimed</p>
                <p className="text-2xl font-bold text-gold-500">{claimedCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Earned</p>
                <p className="text-2xl font-bold text-purple-400">${totalEarned}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Table */}
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        <DataTable
          data={displayData}
          columns={columns}
          emptyMessage={
            filter === 'all'
              ? 'No rewards available'
              : `No ${filter} rewards`
          }
        />
      </div>

      {/* Reward Details Modal */}
      {showDetailsModal && selectedOffer && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOffer(null);
          }}
          title={selectedOffer.title}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-dark-300 rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-5xl">
                  {getTypeIcon(selectedOffer.offer_type)}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gold-500 mb-2">
                    {selectedOffer.title}
                  </h3>
                  <p className="text-gray-300 mb-3">{selectedOffer.description}</p>
                  <Badge variant={getTypeColor(selectedOffer.offer_type)} size="lg">
                    {getTypeLabel(selectedOffer.offer_type)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-dark-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-400 mb-1">Bonus Amount</p>
                  <p className="text-3xl font-bold text-gold-500">${selectedOffer.bonus_amount}</p>
                </div>
                <div className="bg-dark-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-400 mb-1">Expires</p>
                  <p className="text-lg font-medium text-white">
                    {selectedOffer.end_date
                      ? new Date(selectedOffer.end_date).toLocaleDateString()
                      : 'No expiry'}
                  </p>
                </div>
              </div>
            </div>

            {selectedOffer.requirement_description && (
              <div className="bg-dark-300 rounded-lg p-4">
                <h4 className="font-bold text-gold-500 mb-2">Requirements</h4>
                <p className="text-sm text-gray-300">{selectedOffer.requirement_description}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => handleStartClaim(selectedOffer)}
                variant="primary"
                fullWidth
              >
                Claim Reward (+${selectedOffer.bonus_amount})
              </Button>
              <Button
                onClick={() => setShowDetailsModal(false)}
                variant="secondary"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Claim Modal - Simplified (Admin approves now) */}
      {showClaimModal && selectedOffer && (
        <Modal
          isOpen={showClaimModal}
          onClose={() => {
            setShowClaimModal(false);
            setSelectedOffer(null);
            setSelectedClientId(null);
          }}
          title="Claim Reward"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-dark-300 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{getTypeIcon(selectedOffer.offer_type)}</div>
                <div>
                  <h3 className="font-bold text-white">{selectedOffer.title}</h3>
                  <p className="text-gold-500 font-bold">{selectedOffer.bonus_amount} credits bonus</p>
                  <p className="text-sm text-gray-400">= ${(selectedOffer.bonus_amount / 100).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-dark-400 rounded-lg p-4">
              <p className="text-gray-300 mb-2">
                <strong>How it works:</strong>
              </p>
              <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                <li>You submit a claim request</li>
                <li>Admin reviews and approves your claim</li>
                <li>Credits are added to your balance</li>
              </ol>
            </div>

            {selectedOffer.requirement_description && (
              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                <p className="text-sm text-yellow-400">
                  <strong>Requirement:</strong> {selectedOffer.requirement_description}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleClaimReward}
                loading={claiming}
                variant="primary"
                fullWidth
              >
                Submit Claim Request (+{selectedOffer.bonus_amount} credits)
              </Button>
              <Button
                onClick={() => {
                  setShowClaimModal(false);
                  setSelectedClientId(null);
                }}
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Credit Transfer Modal */}
      {showTransferModal && (
        <Modal
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedClientId(null);
            setTransferAmount('');
          }}
          title="Transfer Credits to Client"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-dark-300 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaWallet className="text-3xl text-green-500" />
                  <div>
                    <p className="text-sm text-gray-400">Your Balance</p>
                    <p className="text-2xl font-bold text-green-400">
                      {balance?.credits.toLocaleString() || 0} credits
                    </p>
                  </div>
                </div>
                <p className="text-gray-400">= ${balance?.dollar_value.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            <div>
              <p className="text-gray-400 mb-3">
                Transfer credits to a client for gaming. This is a one-way transaction.
              </p>
              <p className="text-sm text-gold-500 mb-4">Rate: 100 credits = $1</p>

              <Input
                label="Amount (in credits)"
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="e.g., 500"
              />
              {transferAmount && parseInt(transferAmount) > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  = ${(parseInt(transferAmount) / 100).toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-2">Select Client to Transfer To:</p>

              {loadingClients ? (
                <div className="text-center py-8 text-gold-500">Loading clients...</div>
              ) : clients.length === 0 ? (
                <div className="text-center py-8">
                  <MdGroup className="text-5xl text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No connected clients found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Add clients as friends to transfer credits
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {clients.map(client => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => setSelectedClientId(client.id)}
                      className={`w-full p-4 rounded-lg flex items-center gap-3 transition-all ${
                        selectedClientId === client.id
                          ? 'bg-green-600/20 border-2 border-green-500'
                          : 'bg-dark-400 hover:bg-dark-300 border-2 border-transparent'
                      }`}
                    >
                      <Avatar
                        name={client.full_name || client.username}
                        size="md"
                        src={client.profile_picture}
                        online={client.is_online}
                      />
                      <div className="text-left flex-1">
                        <p className="text-white font-medium">{client.username}</p>
                        <p className="text-sm text-gray-400">{client.full_name}</p>
                      </div>
                      {selectedClientId === client.id && (
                        <MdCheckCircle className="text-green-500 text-2xl" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleTransferCredits}
                loading={transferring}
                disabled={!selectedClientId || !transferAmount || parseInt(transferAmount) <= 0 || clients.length === 0}
                variant="primary"
                fullWidth
              >
                <FaPaperPlane className="mr-2" />
                Transfer {transferAmount || '0'} Credits
              </Button>
              <Button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedClientId(null);
                  setTransferAmount('');
                }}
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
