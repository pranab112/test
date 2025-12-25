import { useState } from 'react';
import { StatCard } from '@/components/common/StatCard';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import {
  MdCardGiftcard, MdGroup, MdCasino
} from 'react-icons/md';
import { FaGift, FaTrophy, FaDice } from 'react-icons/fa';
import { GiCash, GiLevelEndFlag, GiCardRandom } from 'react-icons/gi';

// TODO: Replace with API integration
const MOCK_USER = {
  credits: 5000,
  level: 15,
  activePromotions: 3,
  platformRewards: 2,
  friends: 8,
  achievements: 12,
};

export function HomeSection() {
  const [showDiceGame, setShowDiceGame] = useState(false);
  const [showSlotsGame, setShowSlotsGame] = useState(false);
  const [showMemoryGame, setShowMemoryGame] = useState(false);

  const stats = [
    {
      title: 'Credits',
      value: MOCK_USER.credits.toLocaleString(),
      icon: <GiCash />,
      color: 'warning' as const,
    },
    {
      title: 'Level',
      value: MOCK_USER.level.toString(),
      icon: <GiLevelEndFlag />,
      trend: { value: '+2', isPositive: true },
      color: 'purple' as const,
    },
    {
      title: 'Active Promotions',
      value: MOCK_USER.activePromotions.toString(),
      icon: <MdCardGiftcard />,
      color: 'success' as const,
    },
    {
      title: 'Platform Rewards',
      value: MOCK_USER.platformRewards.toString(),
      icon: <FaGift />,
      color: 'info' as const,
    },
    {
      title: 'Friends',
      value: MOCK_USER.friends.toString(),
      icon: <MdGroup />,
      color: 'warning' as const,
    },
    {
      title: 'Achievements',
      value: MOCK_USER.achievements.toString(),
      icon: <FaTrophy />,
      color: 'error' as const,
    },
  ];

  // TODO: Replace with API data
  const recentActivities = [
    {
      title: 'Claimed Welcome Bonus',
      description: 'Received 100 credits',
      time: '2 hours ago',
      type: 'success' as const,
    },
    {
      title: 'Leveled Up to 15',
      description: 'Unlocked new achievements',
      time: '1 day ago',
      type: 'success' as const,
    },
    {
      title: 'New Friend Request',
      description: 'From player_mike',
      time: '2 days ago',
      type: 'info' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Welcome Back!</h1>
        <p className="text-gray-400">Your player dashboard overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
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
            className="bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
          >
            <FaDice className="text-5xl mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Lucky Dice</h3>
            <p className="text-sm text-purple-100">Bet on dice rolls</p>
          </button>

          <button
            onClick={() => setShowSlotsGame(true)}
            className="bg-gradient-to-br from-gold-600 to-yellow-700 hover:from-gold-500 hover:to-yellow-600 text-dark-700 p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
          >
            <GiCardRandom className="text-5xl mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Lucky Slots</h3>
            <p className="text-sm text-yellow-900">Spin to win!</p>
          </button>

          <button
            onClick={() => setShowMemoryGame(true)}
            className="bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white p-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
          >
            <MdCardGiftcard className="text-5xl mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Memory Match</h3>
            <p className="text-sm text-blue-100">Match the cards</p>
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
            <OfferCard
              title="Weekend Bonus"
              description="Claim 50 extra credits"
              value={50}
              expiry="2 days left"
            />
            <OfferCard
              title="Email Verification"
              description="Get 100 credits reward"
              value={100}
              expiry="Platform offer"
            />
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
          <LuckyDiceGame />
        </Modal>
      )}

      {showSlotsGame && (
        <Modal
          isOpen={showSlotsGame}
          onClose={() => setShowSlotsGame(false)}
          title="Lucky Slots Game"
          size="lg"
        >
          <LuckySlotsGame />
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
function LuckyDiceGame() {
  const [bet, setBet] = useState<number>(7);
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [winStreak, setWinStreak] = useState(0);

  const rollDice = () => {
    if (bet < 2 || bet > 12) {
      toast.error('Bet must be between 2 and 12');
      return;
    }

    setRolling(true);
    setResult(null);

    // Animate dice rolling
    const interval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const final1 = Math.floor(Math.random() * 6) + 1;
      const final2 = Math.floor(Math.random() * 6) + 1;
      setDice1(final1);
      setDice2(final2);

      const total = final1 + final2;
      if (total === bet) {
        setResult('win');
        setWinStreak(prev => prev + 1);
        toast.success(`You won! Rolled ${total}`);
      } else {
        setResult('lose');
        setWinStreak(0);
        toast.error(`You lost. Rolled ${total}, bet ${bet}`);
      }

      setRolling(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
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

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Your Bet (2-12)
          </label>
          <input
            type="number"
            min="2"
            max="12"
            value={bet}
            onChange={(e) => setBet(parseInt(e.target.value) || 2)}
            disabled={rolling}
            className="w-full bg-dark-200 border-2 border-gold-700 rounded-lg px-4 py-3 text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>

        <Button
          onClick={rollDice}
          disabled={rolling}
          fullWidth
          variant="primary"
        >
          {rolling ? 'Rolling...' : 'Roll Dice'}
        </Button>

        {result && (
          <div className={`mt-4 p-4 rounded-lg text-center ${
            result === 'win' ? 'bg-green-900/30 border-2 border-green-500' : 'bg-red-900/30 border-2 border-red-500'
          }`}>
            <p className={`text-xl font-bold ${result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
              {result === 'win' ? 'YOU WIN!' : 'YOU LOSE!'}
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
          <li>• Choose a number between 2 and 12</li>
          <li>• Click Roll Dice</li>
          <li>• If the dice sum equals your bet, you win!</li>
          <li>• Build your win streak by winning consecutive games</li>
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
function LuckySlotsGame() {
  const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '7️⃣', '💎'];
  const [reels, setReels] = useState([symbols[0], symbols[0], symbols[0]]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [winStreak, setWinStreak] = useState(0);

  const spin = () => {
    setSpinning(true);
    setResult(null);

    // Animate spinning
    const interval = setInterval(() => {
      setReels([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ]);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const finalReels = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ];
      setReels(finalReels);

      // Check for win
      if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
        setResult('win');
        setWinStreak(prev => prev + 1);
        toast.success('Jackpot! All three match!');
      } else if (finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2]) {
        setResult('win');
        setWinStreak(prev => prev + 1);
        toast.success('Nice! Two symbols match!');
      } else {
        setResult('lose');
        setWinStreak(0);
        toast.error('No match. Try again!');
      }

      setSpinning(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
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

        <Button
          onClick={spin}
          disabled={spinning}
          fullWidth
          variant="primary"
        >
          {spinning ? 'Spinning...' : 'SPIN'}
        </Button>

        {result && (
          <div className={`mt-4 p-4 rounded-lg text-center ${
            result === 'win' ? 'bg-green-900/30 border-2 border-green-500' : 'bg-red-900/30 border-2 border-red-500'
          }`}>
            <p className={`text-xl font-bold ${result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
              {result === 'win' ? 'WINNER!' : 'TRY AGAIN!'}
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
          <li>• Click SPIN to start</li>
          <li>• Match 3 symbols for a jackpot!</li>
          <li>• Match 2 symbols for a small win</li>
          <li>• Build your win streak!</li>
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
  };

  // Timer effect
  useState(() => {
    if (gameStarted && !gameWon) {
      const interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  });

  const handleCardClick = (index: number) => {
    if (!gameStarted) return;
    if (cards[index].flipped || cards[index].matched) return;
    if (flippedIndices.length === 2) return;

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

          // Check if game is won
          if (matchedCards.every(card => card.matched)) {
            setGameWon(true);
            setGameStarted(false);
            toast.success(`You won in ${moves + 1} moves and ${timer} seconds!`);
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
