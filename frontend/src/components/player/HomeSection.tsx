import { useState, useEffect, useRef } from 'react';
import { StatCard } from '@/components/common/StatCard';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import {
  MdCardGiftcard, MdGroup, MdCasino, MdRefresh
} from 'react-icons/md';
import { FaGift, FaTrophy, FaDice } from 'react-icons/fa';
import { GiCash, GiLevelEndFlag, GiCardRandom } from 'react-icons/gi';
import { authApi } from '@/api/endpoints/auth.api';
import { friendsApi } from '@/api/endpoints/friends.api';
import { offersApi, type PlatformOffer, type OfferClaim } from '@/api/endpoints/offers.api';
import { promotionsApi } from '@/api/endpoints/promotions.api';
import { gamesApi } from '@/api/endpoints/games.api';
import type { User } from '@/types';

interface DashboardStats {
  credits: number;
  level: number;
  activePromotions: number;
  platformRewards: number;
  friends: number;
  claimedRewards: number;
}

interface RecentActivity {
  title: string;
  description: string;
  time: string;
  type: 'success' | 'warning' | 'info';
}

export function HomeSection() {
  const [showDiceGame, setShowDiceGame] = useState(false);
  const [showSlotsGame, setShowSlotsGame] = useState(false);
  const [showMemoryGame, setShowMemoryGame] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    credits: 0,
    level: 1,
    activePromotions: 0,
    platformRewards: 0,
    friends: 0,
    claimedRewards: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [availableOffers, setAvailableOffers] = useState<PlatformOffer[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [userData, friendsData, offersData, claimsData, promotionsData] = await Promise.all([
        authApi.getCurrentUser(),
        friendsApi.getFriends().catch(() => []),
        offersApi.getAvailableOffers().catch(() => []),
        offersApi.getMyClaims().catch(() => []),
        promotionsApi.getAvailablePromotions().catch(() => []),
      ]);

      setUser(userData);
      setAvailableOffers((offersData || []).slice(0, 3)); // Show top 3 offers

      // Calculate stats - count active promotions available to the player
      const activePromos = (promotionsData || []).filter((p: any) => p.is_active).length;

      setDashboardStats({
        credits: userData.credits || 0,
        level: userData.player_level || 1,
        activePromotions: activePromos,
        platformRewards: (offersData || []).length,
        friends: (friendsData || []).length,
        claimedRewards: (claimsData || []).filter((c: OfferClaim) => c.status === 'approved' || c.status === 'completed').length,
      });

      // Build recent activities from claims
      const activities: RecentActivity[] = [];

      // Add recent claims as activities
      (claimsData || []).slice(0, 3).forEach((claim: OfferClaim) => {
        const statusText = claim.status === 'pending' ? 'Pending approval'
          : claim.status === 'approved' ? 'Approved!'
          : claim.status === 'completed' ? 'Completed!'
          : 'Rejected';

        activities.push({
          title: `Claimed ${claim.offer_title || 'Reward'}`,
          description: `$${claim.bonus_amount} bonus - ${statusText}`,
          time: formatTimeAgo(claim.claimed_at),
          type: claim.status === 'approved' || claim.status === 'completed' ? 'success' : claim.status === 'pending' ? 'warning' : 'info',
        });
      });

      // Add friend count as activity if they have friends
      if ((friendsData || []).length > 0) {
        activities.push({
          title: 'Connected Friends',
          description: `You have ${(friendsData || []).length} friend${(friendsData || []).length !== 1 ? 's' : ''}`,
          time: 'Current',
          type: 'info',
        });
      }

      setRecentActivities(activities.length > 0 ? activities : [
        {
          title: 'Welcome to Golden Ace!',
          description: 'Start by connecting with clients and claiming rewards',
          time: 'Just now',
          type: 'info',
        },
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const stats = [
    {
      title: 'Credits',
      value: dashboardStats.credits.toLocaleString(),
      icon: <GiCash />,
      color: 'warning' as const,
    },
    {
      title: 'Level',
      value: dashboardStats.level.toString(),
      icon: <GiLevelEndFlag />,
      color: 'purple' as const,
    },
    {
      title: 'Active Promotions',
      value: dashboardStats.activePromotions.toString(),
      icon: <MdCardGiftcard />,
      color: 'success' as const,
    },
    {
      title: 'Platform Rewards',
      value: dashboardStats.platformRewards.toString(),
      icon: <FaGift />,
      color: 'info' as const,
    },
    {
      title: 'Friends',
      value: dashboardStats.friends.toString(),
      icon: <MdGroup />,
      color: 'warning' as const,
    },
    {
      title: 'Claimed Rewards',
      value: dashboardStats.claimedRewards.toString(),
      icon: <FaTrophy />,
      color: 'error' as const,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">
            Welcome Back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-gray-400">Your player dashboard overview</p>
        </div>
        <button
          type="button"
          onClick={loadDashboardData}
          className="bg-dark-300 hover:bg-dark-400 text-gold-500 p-3 rounded-lg transition-colors"
          title="Refresh"
        >
          <MdRefresh size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </div>

      {/* Mini Casino Games */}
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gold-500 mb-4 flex items-center gap-2">
          <MdCasino className="text-3xl" />
          Mini Casino Games
        </h2>
        <p className="text-gray-400 mb-6">Play fun mini games and track your win streaks!</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowDiceGame(true)}
            className="bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center gap-4"
          >
            <FaDice className="text-4xl flex-shrink-0" />
            <div className="text-left">
              <h3 className="text-xl font-bold">Lucky Dice</h3>
              <p className="text-sm text-purple-100">Bet on dice rolls</p>
            </div>
          </button>

          <button
            onClick={() => setShowSlotsGame(true)}
            className="bg-gradient-to-br from-gold-600 to-yellow-700 hover:from-gold-500 hover:to-yellow-600 text-dark-700 p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center gap-4"
          >
            <GiCardRandom className="text-4xl flex-shrink-0" />
            <div className="text-left">
              <h3 className="text-xl font-bold">Lucky Slots</h3>
              <p className="text-sm text-yellow-900">Spin to win!</p>
            </div>
          </button>

          <button
            onClick={() => setShowMemoryGame(true)}
            className="bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg flex items-center gap-4"
          >
            <MdCardGiftcard className="text-4xl flex-shrink-0" />
            <div className="text-left">
              <h3 className="text-xl font-bold">Memory Match</h3>
              <p className="text-sm text-blue-100">Match the cards</p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <ActivityItem key={index} {...activity} />
            ))}
          </div>
        </div>

        {/* Available Offers */}
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">Available Offers</h2>
          <div className="space-y-3">
            {availableOffers.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No offers available right now</p>
            ) : (
              availableOffers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  title={offer.title}
                  description={offer.description}
                  value={offer.bonus_amount}
                  expiry={offer.end_date ? `Expires ${new Date(offer.end_date).toLocaleDateString()}` : 'No expiry'}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Game Modals */}
      {showDiceGame && (
        <Modal
          isOpen={showDiceGame}
          onClose={() => setShowDiceGame(false)}
          title="Lucky Dice Game"
          size="lg"
        >
          <LuckyDiceGame
            credits={dashboardStats.credits}
            onBalanceUpdate={(newBalance) => setDashboardStats(prev => ({ ...prev, credits: newBalance }))}
          />
        </Modal>
      )}

      {showSlotsGame && (
        <Modal
          isOpen={showSlotsGame}
          onClose={() => setShowSlotsGame(false)}
          title="Lucky Slots Game"
          size="lg"
        >
          <LuckySlotsGame
            credits={dashboardStats.credits}
            onBalanceUpdate={(newBalance) => setDashboardStats(prev => ({ ...prev, credits: newBalance }))}
          />
        </Modal>
      )}

      {showMemoryGame && (
        <Modal
          isOpen={showMemoryGame}
          onClose={() => setShowMemoryGame(false)}
          title="Memory Match Game"
          size="lg"
        >
          <MemoryMatchGame />
        </Modal>
      )}
    </div>
  );
}

// Lucky Dice Game Component
function LuckyDiceGame({ credits, onBalanceUpdate }: { credits: number; onBalanceUpdate: (balance: number) => void }) {
  const [prediction, setPrediction] = useState<number>(7);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [winStreak, setWinStreak] = useState(0);
  const [lastWin, setLastWin] = useState<number>(0);
  const [currentCredits, setCurrentCredits] = useState(credits);
  const [cooldown, setCooldown] = useState(false);
  const lastBetTime = useRef<number>(0);

  // Sync local credits state when props change (fixes desync issue)
  useEffect(() => {
    setCurrentCredits(credits);
  }, [credits]);

  // Cleanup interval on unmount
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Game configuration constants
  const MIN_BET = 10;
  const MAX_BET = 10000;

  // Quick prediction selection options - common betting values
  const quickPredictionOptions = [2, 5, 7, 9, 12];
  // Quick bet amount options
  const quickBetAmounts = [10, 25, 50, 100, 250];

  // Validate and set prediction value
  const handlePredictionChange = (value: number) => {
    const validPrediction = Math.min(12, Math.max(2, value || 2));
    setPrediction(validPrediction);
  };

  // Validate and set bet amount
  const handleBetAmountChange = (value: number) => {
    const validAmount = Math.max(MIN_BET, Math.min(value || MIN_BET, Math.min(currentCredits, MAX_BET)));
    setBetAmount(validAmount);
  };

  const rollDice = async () => {
    // Debounce: Prevent rapid clicking (500ms cooldown)
    const now = Date.now();
    if (now - lastBetTime.current < 500) {
      toast.error('Please wait before placing another bet');
      return;
    }

    // Validate prediction before rolling
    if (prediction < 2 || prediction > 12) {
      toast.error('Prediction must be between 2 and 12');
      handlePredictionChange(7);
      return;
    }

    // Validate bet amount
    if (betAmount < MIN_BET) {
      toast.error(`Minimum bet is ${MIN_BET} credits`);
      return;
    }

    if (betAmount > MAX_BET) {
      toast.error(`Maximum bet is ${MAX_BET} credits`);
      return;
    }

    if (betAmount > currentCredits) {
      toast.error('Insufficient credits');
      return;
    }

    setRolling(true);
    setCooldown(true);
    lastBetTime.current = Date.now();
    setResult(null);
    setLastWin(0);

    // Animate dice rolling
    intervalRef.current = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
    }, 100);

    try {
      // Call the API to place the bet
      const response = await gamesApi.placeMiniGameBet({
        game_type: 'dice',
        bet_amount: betAmount,
        prediction: prediction,
      });

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Update dice with actual result from API
      setDice1(response.details.dice1 || 1);
      setDice2(response.details.dice2 || 1);

      // Update credits
      setCurrentCredits(response.new_balance);
      onBalanceUpdate(response.new_balance);

      if (response.result === 'win') {
        setResult('win');
        setWinStreak(prev => prev + 1);
        setLastWin(response.win_amount);
        toast.success(response.message);
      } else {
        setResult('lose');
        setWinStreak(0);
        toast.error(response.message);
      }
    } catch (error: any) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Reset game state on error
      setResult(null);
      setLastWin(0);

      // Show error message (properly extracted from FastAPI response)
      const errorMessage = error?.message || error?.detail || 'Failed to place bet. Please try again.';
      toast.error(errorMessage);

      // Note: Credits are NOT restored because they were never deducted
      // We only update credits on successful API response
    } finally {
      setRolling(false);
      // Reset cooldown after a brief delay
      setTimeout(() => setCooldown(false), 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Credits Display */}
      <div className="bg-gradient-to-r from-gold-600 to-yellow-600 rounded-lg p-4 text-center">
        <p className="text-sm text-dark-700 font-medium">Your Credits</p>
        <p className="text-3xl font-bold text-dark-700">{currentCredits.toLocaleString()}</p>
      </div>

      <div className="bg-dark-300 border-2 border-gold-700 rounded-lg p-6">
        <div className="flex items-center justify-center gap-8 mb-6">
          <Dice value={dice1} rolling={rolling} />
          <Dice value={dice2} rolling={rolling} />
        </div>

        <div className="text-center mb-4">
          <p className="text-2xl font-bold text-gold-500">
            Total: {dice1 + dice2}
          </p>
        </div>

        {/* Bet Amount Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Bet Amount (Credits)
          </label>

          <div className="flex gap-2 mb-3 justify-center flex-wrap">
            {quickBetAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleBetAmountChange(amount)}
                disabled={rolling || amount > currentCredits}
                className={`px-3 py-1 rounded-lg font-bold text-sm transition-all ${
                  betAmount === amount
                    ? 'bg-green-500 text-white scale-105'
                    : amount > currentCredits
                    ? 'bg-dark-400 text-gray-600 cursor-not-allowed'
                    : 'bg-dark-200 text-white hover:bg-dark-400 border border-green-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {amount}
              </button>
            ))}
          </div>

          <input
            type="number"
            min="1"
            max={currentCredits}
            value={betAmount}
            onChange={(e) => handleBetAmountChange(parseInt(e.target.value))}
            disabled={rolling}
            className="w-full bg-dark-200 border-2 border-green-700 rounded-lg px-4 py-2 text-white text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Prediction Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Your Prediction (2-12)
          </label>

          <div className="flex gap-2 mb-3 justify-center flex-wrap">
            {quickPredictionOptions.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePredictionChange(value)}
                disabled={rolling}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  prediction === value
                    ? 'bg-gold-500 text-dark-700 scale-105'
                    : 'bg-dark-200 text-white hover:bg-dark-400 border border-gold-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {value}
              </button>
            ))}
          </div>

          <input
            type="number"
            min="2"
            max="12"
            value={prediction}
            onChange={(e) => handlePredictionChange(parseInt(e.target.value))}
            onBlur={(e) => handlePredictionChange(parseInt(e.target.value))}
            disabled={rolling}
            className="w-full bg-dark-200 border-2 border-gold-700 rounded-lg px-4 py-3 text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>

        <Button
          onClick={rollDice}
          disabled={rolling || cooldown || prediction < 2 || prediction > 12 || betAmount <= 0 || betAmount > currentCredits}
          fullWidth
          variant="primary"
        >
          {rolling ? 'Rolling...' : `Roll Dice (Bet ${betAmount} Credits)`}
        </Button>

        {result && (
          <div className={`mt-4 p-4 rounded-lg text-center ${
            result === 'win' ? 'bg-green-900/30 border-2 border-green-500' : 'bg-red-900/30 border-2 border-red-500'
          }`}>
            <p className={`text-xl font-bold ${result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
              {result === 'win' ? `YOU WIN ${lastWin} CREDITS!` : 'YOU LOSE!'}
            </p>
          </div>
        )}

        <div className="mt-4 text-center">
          <Badge variant={winStreak > 0 ? 'success' : 'default'} size="lg">
            Win Streak: {winStreak}
          </Badge>
        </div>
      </div>

      <div className="bg-dark-300 rounded-lg p-4">
        <h3 className="font-bold text-gold-500 mb-2">How to Play</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Enter how many credits you want to bet</li>
          <li>• Choose a number between 2 and 12</li>
          <li>• Click Roll Dice</li>
          <li>• If the dice sum equals your prediction, you win!</li>
          <li>• Rarer numbers (2, 12) pay more than common ones (7)</li>
        </ul>
      </div>
    </div>
  );
}

// Dice Component
function Dice({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <div className={`w-20 h-20 bg-white rounded-lg shadow-lg flex items-center justify-center relative ${
      rolling ? 'animate-spin' : ''
    }`}>
      <div className="grid grid-cols-3 gap-1 w-16 h-16">
        {value === 1 && <div className="col-start-2 row-start-2 w-3 h-3 bg-black rounded-full" />}
        {value === 2 && (
          <>
            <div className="col-start-1 row-start-1 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-3 row-start-3 w-3 h-3 bg-black rounded-full" />
          </>
        )}
        {value === 3 && (
          <>
            <div className="col-start-1 row-start-1 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-2 row-start-2 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-3 row-start-3 w-3 h-3 bg-black rounded-full" />
          </>
        )}
        {value === 4 && (
          <>
            <div className="col-start-1 row-start-1 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-3 row-start-1 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-1 row-start-3 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-3 row-start-3 w-3 h-3 bg-black rounded-full" />
          </>
        )}
        {value === 5 && (
          <>
            <div className="col-start-1 row-start-1 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-3 row-start-1 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-2 row-start-2 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-1 row-start-3 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-3 row-start-3 w-3 h-3 bg-black rounded-full" />
          </>
        )}
        {value === 6 && (
          <>
            <div className="col-start-1 row-start-1 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-3 row-start-1 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-1 row-start-2 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-3 row-start-2 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-1 row-start-3 w-3 h-3 bg-black rounded-full" />
            <div className="col-start-3 row-start-3 w-3 h-3 bg-black rounded-full" />
          </>
        )}
      </div>
    </div>
  );
}

// Lucky Slots Game Component
function LuckySlotsGame({ credits, onBalanceUpdate }: { credits: number; onBalanceUpdate: (balance: number) => void }) {
  const symbolsDisplay = ['🍒', '🍋', '🍊', '🍇', '⭐', '7️⃣', '💎'];
  const symbolMap: Record<string, string> = {
    'cherry': '🍒', 'lemon': '🍋', 'orange': '🍊', 'grape': '🍇',
    'star': '⭐', 'seven': '7️⃣', 'diamond': '💎'
  };

  const [reels, setReels] = useState([symbolsDisplay[0], symbolsDisplay[0], symbolsDisplay[0]]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | 'jackpot' | null>(null);
  const [winStreak, setWinStreak] = useState(0);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [lastWin, setLastWin] = useState<number>(0);
  const [currentCredits, setCurrentCredits] = useState(credits);
  const [cooldown, setCooldown] = useState(false);
  const lastBetTime = useRef<number>(0);

  // Sync local credits state when props change (fixes desync issue)
  useEffect(() => {
    setCurrentCredits(credits);
  }, [credits]);

  // Cleanup interval on unmount
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Game configuration constants
  const MIN_BET = 10;
  const MAX_BET = 10000;

  // Quick bet amount options
  const quickBetAmounts = [10, 25, 50, 100, 250];

  // Validate and set bet amount
  const handleBetAmountChange = (value: number) => {
    const validAmount = Math.max(MIN_BET, Math.min(value || MIN_BET, Math.min(currentCredits, MAX_BET)));
    setBetAmount(validAmount);
  };

  const spin = async () => {
    // Debounce: Prevent rapid clicking (500ms cooldown)
    const now = Date.now();
    if (now - lastBetTime.current < 500) {
      toast.error('Please wait before placing another bet');
      return;
    }

    // Validate bet amount
    if (betAmount < MIN_BET) {
      toast.error(`Minimum bet is ${MIN_BET} credits`);
      return;
    }

    if (betAmount > MAX_BET) {
      toast.error(`Maximum bet is ${MAX_BET} credits`);
      return;
    }

    if (betAmount > currentCredits) {
      toast.error('Insufficient credits');
      return;
    }

    setSpinning(true);
    setCooldown(true);
    lastBetTime.current = Date.now();
    setResult(null);
    setLastWin(0);

    // Animate spinning
    intervalRef.current = setInterval(() => {
      setReels([
        symbolsDisplay[Math.floor(Math.random() * symbolsDisplay.length)],
        symbolsDisplay[Math.floor(Math.random() * symbolsDisplay.length)],
        symbolsDisplay[Math.floor(Math.random() * symbolsDisplay.length)],
      ]);
    }, 100);

    try {
      // Call the API to place the bet
      const response = await gamesApi.placeMiniGameBet({
        game_type: 'slots',
        bet_amount: betAmount,
      });

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Map API symbols to display emojis
      if (response.details.reels) {
        const displayReels = response.details.reels.map(s => symbolMap[s] || '❓');
        setReels(displayReels);
      }

      // Update credits
      setCurrentCredits(response.new_balance);
      onBalanceUpdate(response.new_balance);

      if (response.result === 'jackpot') {
        setResult('jackpot');
        setWinStreak(prev => prev + 1);
        setLastWin(response.win_amount);
        toast.success(response.message);
      } else if (response.result === 'win') {
        setResult('win');
        setWinStreak(prev => prev + 1);
        setLastWin(response.win_amount);
        toast.success(response.message);
      } else {
        setResult('lose');
        setWinStreak(0);
        toast.error(response.message);
      }
    } catch (error: any) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Reset game state on error
      setResult(null);
      setLastWin(0);
      setWinStreak(0);

      // Show error message (properly extracted from FastAPI response)
      const errorMessage = error?.message || error?.detail || 'Failed to place bet. Please try again.';
      toast.error(errorMessage);

      // Note: Credits are NOT restored because they were never deducted
      // We only update credits on successful API response
    } finally {
      setSpinning(false);
      // Reset cooldown after a brief delay
      setTimeout(() => setCooldown(false), 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Credits Display */}
      <div className="bg-gradient-to-r from-gold-600 to-yellow-600 rounded-lg p-4 text-center">
        <p className="text-sm text-dark-700 font-medium">Your Credits</p>
        <p className="text-3xl font-bold text-dark-700">{currentCredits.toLocaleString()}</p>
      </div>

      <div className="bg-dark-300 border-2 border-gold-700 rounded-lg p-6">
        <div className="flex items-center justify-center gap-4 mb-6 bg-dark-200 p-8 rounded-lg">
          {reels.map((symbol, index) => (
            <div
              key={index}
              className={`w-24 h-24 bg-white rounded-lg flex items-center justify-center text-5xl shadow-lg ${
                spinning ? 'animate-bounce' : ''
              }`}
            >
              {symbol}
            </div>
          ))}
        </div>

        {/* Bet Amount Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Bet Amount (Credits)
          </label>

          <div className="flex gap-2 mb-3 justify-center flex-wrap">
            {quickBetAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleBetAmountChange(amount)}
                disabled={spinning || amount > currentCredits}
                className={`px-3 py-1 rounded-lg font-bold text-sm transition-all ${
                  betAmount === amount
                    ? 'bg-green-500 text-white scale-105'
                    : amount > currentCredits
                    ? 'bg-dark-400 text-gray-600 cursor-not-allowed'
                    : 'bg-dark-200 text-white hover:bg-dark-400 border border-green-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {amount}
              </button>
            ))}
          </div>

          <input
            type="number"
            min="1"
            max={currentCredits}
            value={betAmount}
            onChange={(e) => handleBetAmountChange(parseInt(e.target.value))}
            disabled={spinning}
            className="w-full bg-dark-200 border-2 border-green-700 rounded-lg px-4 py-2 text-white text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <Button
          onClick={spin}
          disabled={spinning || cooldown || betAmount <= 0 || betAmount > currentCredits}
          fullWidth
          variant="primary"
        >
          {spinning ? 'Spinning...' : `SPIN (Bet ${betAmount} Credits)`}
        </Button>

        {result && (
          <div className={`mt-4 p-4 rounded-lg text-center ${
            result === 'jackpot' ? 'bg-yellow-900/30 border-2 border-yellow-500' :
            result === 'win' ? 'bg-green-900/30 border-2 border-green-500' : 'bg-red-900/30 border-2 border-red-500'
          }`}>
            <p className={`text-xl font-bold ${
              result === 'jackpot' ? 'text-yellow-400' :
              result === 'win' ? 'text-green-400' : 'text-red-400'
            }`}>
              {result === 'jackpot' ? `🎰 JACKPOT! ${lastWin} CREDITS! 🎰` :
               result === 'win' ? `WINNER! +${lastWin} CREDITS!` : 'TRY AGAIN!'}
            </p>
          </div>
        )}

        <div className="mt-4 text-center">
          <Badge variant={winStreak > 0 ? 'success' : 'default'} size="lg">
            Win Streak: {winStreak}
          </Badge>
        </div>
      </div>

      <div className="bg-dark-300 rounded-lg p-4">
        <h3 className="font-bold text-gold-500 mb-2">How to Play</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Enter how many credits you want to bet</li>
          <li>• Click SPIN to start</li>
          <li>• Match 3 symbols for a jackpot! (5x - 50x)</li>
          <li>• Match 2 symbols for a small win (2x)</li>
          <li>• 💎 Diamond pays the most!</li>
        </ul>
      </div>
    </div>
  );
}

// Memory Match Game Component
function MemoryMatchGame() {
  const cardSymbols = ['♠️', '♥️', '♦️', '♣️', '⭐', '🌙', '☀️', '⚡'];
  const [cards, setCards] = useState<Array<{ id: number; symbol: string; flipped: boolean; matched: boolean }>>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);

  const initializeGame = () => {
    const shuffled = [...cardSymbols, ...cardSymbols]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: index,
        symbol,
        flipped: false,
        matched: false,
      }));
    setCards(shuffled);
    setFlippedIndices([]);
    setMoves(0);
    setTimer(0);
    setGameStarted(true);
    setGameWon(false);
    setTimerStarted(false); // Timer starts on first move
  };

  // Timer effect - properly using useEffect with correct dependencies
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    // Only run timer when game has started, timer has been triggered by first move, and game is not won
    if (timerStarted && !gameWon) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }

    // Cleanup function
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timerStarted, gameWon]);

  const handleCardClick = (index: number) => {
    if (!gameStarted) return;
    if (cards[index].flipped || cards[index].matched) return;
    if (flippedIndices.length === 2) return;

    // Start timer on first valid move
    if (!timerStarted) {
      setTimerStarted(true);
    }

    const newCards = [...cards];
    newCards[index].flipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      const [first, second] = newFlipped;

      if (cards[first].symbol === cards[second].symbol) {
        // Match found
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[first].matched = true;
          matchedCards[second].matched = true;
          setCards(matchedCards);
          setFlippedIndices([]);

          // Check if game is won - need to use functional update to get correct timer value
          if (matchedCards.every(card => card.matched)) {
            setGameWon(true);
            setGameStarted(false);
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          const unflippedCards = [...cards];
          unflippedCards[first].flipped = false;
          unflippedCards[second].flipped = false;
          setCards(unflippedCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  // Effect to show win message with correct timer value
  useEffect(() => {
    if (gameWon) {
      toast.success(`You won in ${moves} moves and ${timer} seconds!`);
    }
  }, [gameWon, moves, timer]);

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <Button onClick={initializeGame} variant="primary">
          Start New Game
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-dark-300 rounded-lg p-4">
        <div className="text-center">
          <p className="text-sm text-gray-400">Moves</p>
          <p className="text-2xl font-bold text-gold-500">{moves}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-400">Time</p>
          <p className="text-2xl font-bold text-gold-500">{timer}s</p>
        </div>
        <Button onClick={initializeGame} variant="secondary">
          New Game
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(index)}
            disabled={card.matched || card.flipped}
            className={`aspect-square rounded-lg text-4xl font-bold transition-all transform ${
              card.flipped || card.matched
                ? 'bg-white text-black scale-100'
                : 'bg-gradient-to-br from-gold-600 to-yellow-700 text-transparent hover:scale-105'
            } ${card.matched ? 'opacity-50' : ''}`}
          >
            {card.flipped || card.matched ? card.symbol : '?'}
          </button>
        ))}
      </div>

      {gameWon && (
        <div className="bg-green-900/30 border-2 border-green-500 rounded-lg p-6 text-center">
          <p className="text-2xl font-bold text-green-400 mb-2">Congratulations!</p>
          <p className="text-white">You completed the game in {moves} moves and {timer} seconds!</p>
        </div>
      )}

      <div className="bg-dark-300 rounded-lg p-4">
        <h3 className="font-bold text-gold-500 mb-2">How to Play</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Click cards to flip them</li>
          <li>• Match pairs of identical symbols</li>
          <li>• Complete all pairs to win</li>
          <li>• Try to win in the fewest moves!</li>
        </ul>
      </div>
    </div>
  );
}

// Helper Components
function ActivityItem({
  title,
  description,
  time,
  type
}: {
  title: string;
  description: string;
  time: string;
  type: 'success' | 'warning' | 'info';
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-dark-300 rounded-lg">
      <div className={`w-2 h-2 rounded-full mt-2 ${
        type === 'success' ? 'bg-green-500' :
        type === 'warning' ? 'bg-yellow-500' :
        'bg-blue-500'
      }`} />
      <div className="flex-1">
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-gray-400">{description}</p>
        <p className="text-xs text-gray-500 mt-1">{time}</p>
      </div>
    </div>
  );
}

function OfferCard({
  title,
  description,
  value,
  expiry
}: {
  title: string;
  description: string;
  value: number;
  expiry: string;
}) {
  return (
    <div className="p-4 bg-dark-300 border border-gold-700 rounded-lg hover:shadow-gold transition-all">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <Badge variant="success" size="lg">{value}</Badge>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-500">{expiry}</span>
        <button className="bg-gold-gradient text-dark-700 font-bold px-4 py-1 rounded text-sm hover:shadow-gold transition-all">
          Claim
        </button>
      </div>
    </div>
  );
}
