import { useState } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { FaGift, FaTrophy, FaMedal, FaStar } from 'react-icons/fa';
import { MdCheckCircle, MdLock } from 'react-icons/md';

interface Reward {
  id: number;
  title: string;
  description: string;
  type: 'verification' | 'welcome' | 'achievement' | 'referral' | 'loyalty';
  bonus: number;
  status: 'available' | 'claimed' | 'locked';
  expires: string;
  requirements?: string;
  icon?: string;
}

// TODO: Replace with API data
const MOCK_REWARDS: Reward[] = [
  {
    id: 1,
    title: 'Email Verification Bonus',
    description: 'Verify your email to unlock this reward',
    type: 'verification',
    bonus: 100,
    status: 'available',
    expires: 'No expiry',
    requirements: 'Verify your email address',
  },
  {
    id: 2,
    title: 'Welcome to Golden Ace',
    description: 'Thank you for joining our platform',
    type: 'welcome',
    bonus: 50,
    status: 'claimed',
    expires: 'Claimed',
  },
  {
    id: 3,
    title: 'First Friend Added',
    description: 'Add your first friend to the platform',
    type: 'achievement',
    bonus: 25,
    status: 'claimed',
    expires: 'Claimed',
  },
  {
    id: 4,
    title: 'Level 20 Achievement',
    description: 'Reach level 20 to unlock',
    type: 'achievement',
    bonus: 150,
    status: 'locked',
    expires: 'Unlock at Level 20',
    requirements: 'Reach player level 20',
  },
  {
    id: 5,
    title: 'Refer 5 Friends',
    description: 'Get rewarded for bringing friends',
    type: 'referral',
    bonus: 200,
    status: 'locked',
    expires: 'Unlock with 5 referrals',
    requirements: 'Refer 5 friends who reach level 5',
  },
  {
    id: 6,
    title: 'Phone Verification',
    description: 'Add and verify your phone number',
    type: 'verification',
    bonus: 75,
    status: 'available',
    expires: 'No expiry',
    requirements: 'Verify your phone number',
  },
  {
    id: 7,
    title: '30-Day Loyalty Reward',
    description: 'Active for 30 consecutive days',
    type: 'loyalty',
    bonus: 300,
    status: 'locked',
    expires: 'Unlock with 30 active days',
    requirements: 'Be active for 30 consecutive days',
  },
];

export function RewardsSection() {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'claimed' | 'locked'>('all');

  const handleViewDetails = (reward: Reward) => {
    setSelectedReward(reward);
    setShowDetailsModal(true);
  };

  const handleClaimReward = (reward: Reward) => {
    setClaiming(true);
    // TODO: API call to claim reward
    setTimeout(() => {
      setClaiming(false);
      toast.success(`Successfully claimed "${reward.title}"! +${reward.bonus} credits`);
      setShowDetailsModal(false);
    }, 1000);
  };

  const getTypeIcon = (type: Reward['type']) => {
    switch (type) {
      case 'verification': return <MdCheckCircle className="text-blue-500" />;
      case 'welcome': return <FaGift className="text-gold-500" />;
      case 'achievement': return <FaTrophy className="text-purple-500" />;
      case 'referral': return <FaStar className="text-green-500" />;
      case 'loyalty': return <FaMedal className="text-red-500" />;
      default: return <FaGift className="text-gold-500" />;
    }
  };

  const getTypeColor = (type: Reward['type']): 'info' | 'warning' | 'purple' | 'success' | 'error' | 'default' => {
    switch (type) {
      case 'verification': return 'info';
      case 'welcome': return 'warning';
      case 'achievement': return 'purple';
      case 'referral': return 'success';
      case 'loyalty': return 'error';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: Reward['type']) => {
    return type.replace('_', ' ').toUpperCase();
  };

  const filteredRewards = MOCK_REWARDS.filter(reward => {
    if (filter === 'all') return true;
    return reward.status === filter;
  });

  const columns = [
    {
      key: 'title',
      label: 'Reward',
      width: '30%',
      render: (reward: Reward) => (
        <div className="flex items-center gap-3">
          <div className="text-2xl">
            {reward.status === 'locked' ? <MdLock className="text-gray-600" /> : getTypeIcon(reward.type)}
          </div>
          <div>
            <div className="font-medium text-white">{reward.title}</div>
            <div className="text-xs text-gray-400 mt-1">{reward.description}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (reward: Reward) => (
        <Badge variant={getTypeColor(reward.type)}>
          {getTypeLabel(reward.type)}
        </Badge>
      ),
    },
    {
      key: 'bonus',
      label: 'Bonus Amount',
      render: (reward: Reward) => (
        <div className="flex items-center gap-1">
          <span className="font-bold text-gold-500 text-lg">{reward.bonus}</span>
          <span className="text-sm text-gray-400">credits</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (reward: Reward) => {
        let variant: 'success' | 'default' | 'warning' = 'default';
        if (reward.status === 'available') variant = 'success';
        if (reward.status === 'locked') variant = 'warning';
        return (
          <Badge variant={variant}>
            {reward.status.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: 'expires',
      label: 'Expires',
      render: (reward: Reward) => (
        <span className="text-sm text-gray-400">{reward.expires}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (reward: Reward) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewDetails(reward)}
            className="text-blue-500 hover:text-blue-400 text-sm font-medium"
          >
            Details
          </button>
          {reward.status === 'available' && (
            <button
              onClick={() => {
                setSelectedReward(reward);
                handleClaimReward(reward);
              }}
              className="bg-gold-gradient text-dark-700 font-bold px-3 py-1 rounded text-sm hover:shadow-gold transition-all"
            >
              Claim
            </button>
          )}
        </div>
      ),
    },
  ];

  const availableCount = MOCK_REWARDS.filter(r => r.status === 'available').length;
  const claimedCount = MOCK_REWARDS.filter(r => r.status === 'claimed').length;
  const totalEarned = MOCK_REWARDS.filter(r => r.status === 'claimed').reduce((sum, r) => sum + r.bonus, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Platform Rewards</h1>
          <p className="text-gray-400">Special rewards from Golden Ace platform</p>
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
            All ({MOCK_REWARDS.length})
          </button>
          <button
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

      {/* Stats Banner */}
      <div className="bg-gradient-to-r from-gold-900/40 to-yellow-900/40 border-2 border-gold-700 rounded-lg p-6">
        <div className="flex items-center gap-6">
          <FaGift className="text-6xl text-gold-500" />
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gold-500 mb-2">Earn More Rewards!</h3>
            <p className="text-gray-300 mb-3">Complete tasks and achievements to unlock exclusive platform rewards.</p>
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
                <p className="text-2xl font-bold text-purple-400">{totalEarned}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Table */}
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        <DataTable
          data={filteredRewards}
          columns={columns}
          emptyMessage={
            filter === 'all'
              ? 'No rewards available'
              : `No ${filter} rewards`
          }
        />
      </div>

      {/* Reward Details Modal */}
      {showDetailsModal && selectedReward && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedReward(null);
          }}
          title={selectedReward.title}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-dark-300 rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-5xl">
                  {selectedReward.status === 'locked' ? (
                    <MdLock className="text-gray-600" />
                  ) : (
                    getTypeIcon(selectedReward.type)
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gold-500 mb-2">
                    {selectedReward.title}
                  </h3>
                  <p className="text-gray-300 mb-3">{selectedReward.description}</p>
                  <Badge variant={getTypeColor(selectedReward.type)} size="lg">
                    {getTypeLabel(selectedReward.type)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-dark-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-400 mb-1">Bonus Amount</p>
                  <p className="text-3xl font-bold text-gold-500">{selectedReward.bonus}</p>
                  <p className="text-xs text-gray-400">credits</p>
                </div>
                <div className="bg-dark-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-400 mb-1">Status</p>
                  <Badge
                    variant={
                      selectedReward.status === 'available'
                        ? 'success'
                        : selectedReward.status === 'claimed'
                        ? 'default'
                        : 'warning'
                    }
                    size="lg"
                  >
                    {selectedReward.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="bg-dark-200 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Expires</p>
                <p className="text-white font-medium">{selectedReward.expires}</p>
              </div>
            </div>

            {selectedReward.requirements && (
              <div className="bg-dark-300 rounded-lg p-4">
                <h4 className="font-bold text-gold-500 mb-2">Requirements</h4>
                <p className="text-sm text-gray-300">{selectedReward.requirements}</p>
              </div>
            )}

            {selectedReward.status === 'available' && (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleClaimReward(selectedReward)}
                  loading={claiming}
                  variant="primary"
                  fullWidth
                >
                  Claim Reward (+{selectedReward.bonus} credits)
                </Button>
                <Button
                  onClick={() => setShowDetailsModal(false)}
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            )}

            {selectedReward.status === 'claimed' && (
              <div className="bg-green-900/30 border-2 border-green-500 rounded-lg p-4 text-center">
                <MdCheckCircle className="text-5xl text-green-500 mx-auto mb-2" />
                <p className="text-green-400 font-bold text-lg">Already Claimed</p>
                <p className="text-sm text-gray-400 mt-1">
                  You have already received this reward
                </p>
              </div>
            )}

            {selectedReward.status === 'locked' && (
              <div className="bg-yellow-900/30 border-2 border-yellow-600 rounded-lg p-4 text-center">
                <MdLock className="text-5xl text-yellow-500 mx-auto mb-2" />
                <p className="text-yellow-400 font-bold text-lg">Locked</p>
                <p className="text-sm text-gray-400 mt-1">
                  Complete the requirements to unlock this reward
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
