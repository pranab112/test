import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/common/StatCard';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { Modal } from '@/components/common/Modal';
import {
  MdPeople, MdMessage, MdStar,
  MdCardGiftcard, MdGroup
} from 'react-icons/md';
import { FaGamepad, FaChartLine, FaUserPlus } from 'react-icons/fa';

export default function ClientDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection />;
      case 'players':
        return <PlayersSection />;
      case 'games':
        return <GamesSection />;
      case 'promotions':
        return <PromotionsSection />;
      case 'analytics':
        return <AnalyticsSection />;
      case 'friends':
        return <FriendsSection />;
      case 'messages':
        return <MessagesSection />;
      case 'reports':
        return <ReportsSection />;
      case 'reviews':
        return <ReviewsSection />;
      case 'settings':
        return <SettingsSection />;
      default:
        return <DashboardSection />;
    }
  };

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderContent()}
    </DashboardLayout>
  );
}

function DashboardSection() {
  const stats = [
    {
      title: 'Total Players',
      value: '234',
      icon: <MdPeople />,
      trend: { value: '+18', isPositive: true },
      color: 'gold' as const,
    },
    {
      title: 'Active Promotions',
      value: '8',
      icon: <MdCardGiftcard />,
      color: 'purple' as const,
    },
    {
      title: 'Total Claims',
      value: '1,456',
      icon: <FaChartLine />,
      trend: { value: '+23%', isPositive: true },
      color: 'green' as const,
    },
    {
      title: 'Available Games',
      value: '24',
      icon: <FaGamepad />,
      color: 'blue' as const,
    },
    {
      title: 'Pending Approvals',
      value: '5',
      icon: <FaUserPlus />,
      color: 'red' as const,
    },
    {
      title: 'Friends',
      value: '12',
      icon: <MdGroup />,
      color: 'gold' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Dashboard</h1>
        <p className="text-gray-400">Overview of your client portal</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">Recent Player Activity</h2>
          <div className="space-y-3">
            <ActivityItem
              player="john_doe"
              action="claimed Welcome Bonus"
              time="5 minutes ago"
              type="success"
            />
            <ActivityItem
              player="jane_smith"
              action="registered"
              time="1 hour ago"
              type="info"
            />
            <ActivityItem
              player="mike_wilson"
              action="completed level 10"
              time="3 hours ago"
              type="success"
            />
          </div>
        </div>

        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">Top Performing Promotions</h2>
          <div className="space-y-3">
            <PromotionItem
              title="Welcome Bonus"
              claims={89}
              percentage={78}
            />
            <PromotionItem
              title="Weekend Cashback"
              claims={67}
              percentage={65}
            />
            <PromotionItem
              title="Level Up Rewards"
              claims={45}
              percentage={42}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayersSection() {
  const [showModal, setShowModal] = useState(false);

  const players = [
    { id: 1, username: 'john_doe', full_name: 'John Doe', level: 15, credits: 5000, is_online: true, last_seen: 'Online' },
    { id: 2, username: 'jane_smith', full_name: 'Jane Smith', level: 8, credits: 2500, is_online: false, last_seen: '2 hours ago' },
    { id: 3, username: 'mike_wilson', full_name: 'Mike Wilson', level: 22, credits: 12000, is_online: true, last_seen: 'Online' },
  ];

  const columns = [
    {
      key: 'username',
      label: 'Player',
      render: (player: typeof players[0]) => (
        <div className="flex items-center gap-3">
          <Avatar name={player.full_name} size="sm" online={player.is_online} />
          <div>
            <div className="font-medium text-white">{player.username}</div>
            <div className="text-xs text-gray-400">{player.full_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'level',
      label: 'Level',
      render: (player: typeof players[0]) => (
        <Badge variant="info">Level {player.level}</Badge>
      ),
    },
    { key: 'credits', label: 'Credits' },
    { key: 'last_seen', label: 'Last Seen' },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <button className="text-gold-500 hover:text-gold-400 text-sm font-medium">
          View Details
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Players</h1>
          <p className="text-gray-400">Manage your registered players</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gold-gradient text-dark-700 font-bold px-6 py-3 rounded-lg hover:shadow-gold transition-all flex items-center gap-2"
        >
          <FaUserPlus />
          Register New Player
        </button>
      </div>

      <DataTable
        data={players}
        columns={columns}
        emptyMessage="No players found"
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Register New Player"
        footer={
          <>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border-2 border-gold-700 text-gold-500 rounded-lg hover:bg-dark-300 transition-colors"
            >
              Cancel
            </button>
            <button className="bg-gold-gradient text-dark-700 font-bold px-6 py-2 rounded-lg hover:shadow-gold transition-all">
              Register Player
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
            <input
              type="text"
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Enter full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password (Optional)</label>
            <input
              type="password"
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Leave blank for auto-generated password"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function GamesSection() {
  const games = [
    { id: 1, name: 'aviator', display_name: 'Aviator', icon: '/images/games/aviator.png', category: 'Crash', is_active: true },
    { id: 2, name: 'bacbo', display_name: 'Bac Bo', icon: '/images/games/bacbo.png', category: 'Card', is_active: true },
    { id: 3, name: 'baccarat', display_name: 'Baccarat', icon: '/images/games/baccarat.png', category: 'Card', is_active: true },
    { id: 4, name: 'cricket', display_name: 'Cricket', icon: '/images/games/cricket.png', category: 'Sports', is_active: true },
    { id: 5, name: 'dragontiger', display_name: 'Dragon Tiger', icon: '/images/games/dragontiger.png', category: 'Card', is_active: true },
    { id: 6, name: 'poker', display_name: 'Poker', icon: '/images/games/poker.png', category: 'Card', is_active: true },
    { id: 7, name: 'roulette', display_name: 'Roulette', icon: '/images/games/roulette.png', category: 'Table', is_active: true },
    { id: 8, name: 'teenpatti', display_name: 'Teen Patti', icon: '/images/games/teenpatti.png', category: 'Card', is_active: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Games Library</h1>
        <p className="text-gray-400">Manage your available games</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {games.map((game) => (
          <div
            key={game.id}
            className="bg-dark-200 border-2 border-gold-700 rounded-lg p-4 hover:shadow-gold transition-all group cursor-pointer"
          >
            <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-dark-300">
              <img
                src={game.icon}
                alt={game.display_name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
              />
            </div>
            <h3 className="text-white font-bold text-center mb-1">{game.display_name}</h3>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="info" size="sm">{game.category}</Badge>
              <Badge variant="success" size="sm" dot>Active</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PromotionsSection() {
  const [showModal, setShowModal] = useState(false);

  const promotions = [
    { id: 1, title: 'Welcome Bonus', type: 'bonus', value: 100, claims: 89, max_claims: 100, status: 'active', end_date: '2025-12-31' },
    { id: 2, title: 'Weekend Cashback', type: 'cashback', value: 20, claims: 67, max_claims: 200, status: 'active', end_date: '2025-12-30' },
  ];

  const columns = [
    { key: 'title', label: 'Promotion', width: '25%' },
    {
      key: 'type',
      label: 'Type',
      render: (promo: typeof promotions[0]) => (
        <Badge variant="info">{promo.type.toUpperCase()}</Badge>
      ),
    },
    { key: 'value', label: 'Value' },
    {
      key: 'claims',
      label: 'Claims',
      render: (promo: typeof promotions[0]) => (
        <span>{promo.claims} / {promo.max_claims}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (promo: typeof promotions[0]) => (
        <Badge variant="success" dot>
          {promo.status.toUpperCase()}
        </Badge>
      ),
    },
    { key: 'end_date', label: 'End Date' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Promotions</h1>
          <p className="text-gray-400">Create and manage player promotions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gold-gradient text-dark-700 font-bold px-6 py-3 rounded-lg hover:shadow-gold transition-all"
        >
          Create Promotion
        </button>
      </div>

      <DataTable
        data={promotions}
        columns={columns}
        emptyMessage="No promotions found"
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Promotion"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border-2 border-gold-700 text-gold-500 rounded-lg hover:bg-dark-300 transition-colors"
            >
              Cancel
            </button>
            <button className="bg-gold-gradient text-dark-700 font-bold px-6 py-2 rounded-lg hover:shadow-gold transition-all">
              Create Promotion
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Promotion Title</label>
            <input
              type="text"
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Enter promotion title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <select className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500">
              <option>Bonus</option>
              <option>Cashback</option>
              <option>Free Spins</option>
              <option>Credits</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Value</label>
            <input
              type="number"
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Enter value"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Max Claims Per Player</label>
            <input
              type="number"
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AnalyticsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Analytics</h1>
        <p className="text-gray-400">Performance metrics and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value="$12,450"
          icon={<FaChartLine />}
          trend={{ value: '+15%', isPositive: true }}
          color="gold"
        />
        <StatCard
          title="Active Players"
          value="189"
          icon={<MdPeople />}
          trend={{ value: '+8%', isPositive: true }}
          color="green"
        />
        <StatCard
          title="Promotion Claims"
          value="1,456"
          icon={<MdCardGiftcard />}
          trend={{ value: '+23%', isPositive: true }}
          color="purple"
        />
        <StatCard
          title="Avg. Player Level"
          value="12.5"
          icon={<FaGamepad />}
          color="blue"
        />
      </div>

      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
        <FaChartLine className="text-6xl text-gold-500 mx-auto mb-4" />
        <p className="text-gray-400">Detailed analytics charts coming soon</p>
      </div>
    </div>
  );
}

function FriendsSection() {
  const friends = [
    { id: 1, username: 'client_xyz', full_name: 'XYZ Corporation', is_online: true, company_name: 'XYZ Corp' },
    { id: 2, username: 'client_abc', full_name: 'ABC Company', is_online: false, company_name: 'ABC Ltd' },
  ];

  const columns = [
    {
      key: 'username',
      label: 'Client',
      render: (friend: typeof friends[0]) => (
        <div className="flex items-center gap-3">
          <Avatar name={friend.full_name} size="sm" online={friend.is_online} />
          <div>
            <div className="font-medium text-white">{friend.username}</div>
            <div className="text-xs text-gray-400">{friend.company_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'is_online',
      label: 'Status',
      render: (friend: typeof friends[0]) => (
        <Badge variant={friend.is_online ? 'success' : 'default'} dot>
          {friend.is_online ? 'Online' : 'Offline'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <button className="text-gold-500 hover:text-gold-400 text-sm font-medium">
          Send Message
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Friends</h1>
        <p className="text-gray-400">Connect with other clients</p>
      </div>

      <DataTable
        data={friends}
        columns={columns}
        emptyMessage="No friends found"
      />
    </div>
  );
}

function MessagesSection() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gold-500">Messages</h1>
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
        <MdMessage className="text-6xl text-gold-500 mx-auto mb-4" />
        <p className="text-gray-400">Messaging system coming soon</p>
      </div>
    </div>
  );
}

function ReportsSection() {
  const reports = [
    { id: 1, reported_user: 'Player Mike', reason: 'Inappropriate behavior', status: 'pending', created_at: '2025-12-23' },
  ];

  const columns = [
    { key: 'reported_user', label: 'Reported User' },
    { key: 'reason', label: 'Reason', width: '40%' },
    {
      key: 'status',
      label: 'Status',
      render: (report: typeof reports[0]) => (
        <Badge variant={report.status === 'pending' ? 'warning' : 'success'}>
          {report.status.toUpperCase()}
        </Badge>
      ),
    },
    { key: 'created_at', label: 'Date' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Reports</h1>
        <p className="text-gray-400">Your submitted reports</p>
      </div>

      <DataTable
        data={reports}
        columns={columns}
        emptyMessage="No reports found"
      />
    </div>
  );
}

function ReviewsSection() {
  const reviews = [
    { id: 1, reviewee: 'Player John', rating: 5, title: 'Excellent player!', created_at: '2025-12-22' },
    { id: 2, reviewee: 'Player Sarah', rating: 4, title: 'Good experience', created_at: '2025-12-20' },
  ];

  const columns = [
    { key: 'reviewee', label: 'Player' },
    {
      key: 'rating',
      label: 'Rating',
      render: (review: typeof reviews[0]) => (
        <div className="flex items-center gap-1">
          <MdStar className="text-gold-500" />
          <span className="font-medium">{review.rating}/5</span>
        </div>
      ),
    },
    { key: 'title', label: 'Title', width: '40%' },
    { key: 'created_at', label: 'Date' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Reviews</h1>
        <p className="text-gray-400">Your player reviews</p>
      </div>

      <DataTable
        data={reviews}
        columns={columns}
        emptyMessage="No reviews found"
      />
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account settings</p>
      </div>

      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gold-500 mb-4">Account Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
            <input
              type="text"
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Your Company Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="your@email.com"
            />
          </div>
          <button className="bg-gold-gradient text-dark-700 font-bold px-6 py-3 rounded-lg hover:shadow-gold transition-all">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper components
function ActivityItem({
  player,
  action,
  time,
  type
}: {
  player: string;
  action: string;
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
        <p className="text-gray-300">
          <span className="font-medium text-white">{player}</span> {action}
        </p>
        <p className="text-xs text-gray-500 mt-1">{time}</p>
      </div>
    </div>
  );
}

function PromotionItem({
  title,
  claims,
  percentage
}: {
  title: string;
  claims: number;
  percentage: number;
}) {
  return (
    <div className="p-3 bg-dark-300 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-white">{title}</span>
        <span className="text-sm text-gray-400">{claims} claims</span>
      </div>
      <div className="w-full bg-dark-400 rounded-full h-2">
        <div
          className="bg-gold-gradient h-2 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
