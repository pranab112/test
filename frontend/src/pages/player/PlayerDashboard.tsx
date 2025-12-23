import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/common/StatCard';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import {
  MdMessage, MdStar, MdCardGiftcard, MdGroup
} from 'react-icons/md';
import { FaGift, FaTrophy } from 'react-icons/fa';
import { GiCash, GiLevelEndFlag } from 'react-icons/gi';

export default function PlayerDashboard() {
  const [activeSection, setActiveSection] = useState('home');

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <HomeSection />;
      case 'clients':
        return <ClientsSection />;
      case 'friends':
        return <FriendsSection />;
      case 'messages':
        return <MessagesSection />;
      case 'promotions':
        return <PromotionsSection />;
      case 'rewards':
        return <RewardsSection />;
      case 'reports':
        return <ReportsSection />;
      case 'reviews':
        return <ReviewsSection />;
      case 'settings':
        return <SettingsSection />;
      default:
        return <HomeSection />;
    }
  };

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderContent()}
    </DashboardLayout>
  );
}

function HomeSection() {
  const stats = [
    {
      title: 'Credits',
      value: '5,000',
      icon: <GiCash />,
      color: 'gold' as const,
    },
    {
      title: 'Level',
      value: '15',
      icon: <GiLevelEndFlag />,
      trend: { value: '+2', isPositive: true },
      color: 'purple' as const,
    },
    {
      title: 'Active Promotions',
      value: '3',
      icon: <MdCardGiftcard />,
      color: 'green' as const,
    },
    {
      title: 'Platform Rewards',
      value: '2',
      icon: <FaGift />,
      color: 'blue' as const,
    },
    {
      title: 'Friends',
      value: '8',
      icon: <MdGroup />,
      color: 'gold' as const,
    },
    {
      title: 'Achievements',
      value: '12',
      icon: <FaTrophy />,
      color: 'red' as const,
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <ActivityItem
              title="Claimed Welcome Bonus"
              description="Received 100 credits"
              time="2 hours ago"
              type="success"
            />
            <ActivityItem
              title="Leveled Up to 15"
              description="Unlocked new achievements"
              time="1 day ago"
              type="success"
            />
            <ActivityItem
              title="New Friend Request"
              description="From player_mike"
              time="2 days ago"
              type="info"
            />
          </div>
        </div>

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
    </div>
  );
}

function ClientsSection() {
  const clients = [
    { id: 1, username: 'client_abc', company_name: 'ABC Company', is_online: true, promotions: 5, rating: 4.8 },
    { id: 2, username: 'client_xyz', company_name: 'XYZ Corporation', is_online: false, promotions: 3, rating: 4.5 },
  ];

  const columns = [
    {
      key: 'username',
      label: 'Client',
      render: (client: typeof clients[0]) => (
        <div className="flex items-center gap-3">
          <Avatar name={client.company_name} size="sm" online={client.is_online} />
          <div>
            <div className="font-medium text-white">{client.username}</div>
            <div className="text-xs text-gray-400">{client.company_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'is_online',
      label: 'Status',
      render: (client: typeof clients[0]) => (
        <Badge variant={client.is_online ? 'success' : 'default'} dot>
          {client.is_online ? 'Online' : 'Offline'}
        </Badge>
      ),
    },
    { key: 'promotions', label: 'Active Promotions' },
    {
      key: 'rating',
      label: 'Rating',
      render: (client: typeof clients[0]) => (
        <div className="flex items-center gap-1">
          <MdStar className="text-gold-500" />
          <span className="font-medium">{client.rating}/5</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <button className="text-gold-500 hover:text-gold-400 text-sm font-medium">
          View Offers
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Available Clients</h1>
        <p className="text-gray-400">Browse and connect with clients</p>
      </div>

      <DataTable
        data={clients}
        columns={columns}
        emptyMessage="No clients found"
      />
    </div>
  );
}

function FriendsSection() {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  const friends = [
    { id: 1, username: 'player_john', full_name: 'John Doe', level: 18, is_online: true },
    { id: 2, username: 'player_sarah', full_name: 'Sarah Smith', level: 12, is_online: false },
  ];

  const requests = [
    { id: 1, username: 'player_mike', full_name: 'Mike Wilson', level: 20, created_at: '2 hours ago' },
  ];

  const friendColumns = [
    {
      key: 'username',
      label: 'Player',
      render: (friend: typeof friends[0]) => (
        <div className="flex items-center gap-3">
          <Avatar name={friend.full_name} size="sm" online={friend.is_online} />
          <div>
            <div className="font-medium text-white">{friend.username}</div>
            <div className="text-xs text-gray-400">{friend.full_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'level',
      label: 'Level',
      render: (friend: typeof friends[0]) => (
        <Badge variant="info">Level {friend.level}</Badge>
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

  const requestColumns = [
    {
      key: 'username',
      label: 'Player',
      render: (request: typeof requests[0]) => (
        <div className="flex items-center gap-3">
          <Avatar name={request.full_name} size="sm" />
          <div>
            <div className="font-medium text-white">{request.username}</div>
            <div className="text-xs text-gray-400">{request.full_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'level',
      label: 'Level',
      render: (request: typeof requests[0]) => (
        <Badge variant="info">Level {request.level}</Badge>
      ),
    },
    { key: 'created_at', label: 'Received' },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors">
            Accept
          </button>
          <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors">
            Decline
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gold-500">Friends</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'friends'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Friends
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'requests'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Requests
          </button>
        </div>
      </div>

      {activeTab === 'friends' ? (
        <DataTable
          data={friends}
          columns={friendColumns}
          emptyMessage="No friends found"
        />
      ) : (
        <DataTable
          data={requests}
          columns={requestColumns}
          emptyMessage="No pending requests"
        />
      )}
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

function PromotionsSection() {
  const promotions = [
    { id: 1, title: 'Welcome Bonus', client: 'ABC Company', type: 'bonus', value: 100, status: 'available', end_date: '2025-12-31' },
    { id: 2, title: 'Weekend Cashback', client: 'XYZ Corp', type: 'cashback', value: 20, status: 'claimed', end_date: '2025-12-30' },
    { id: 3, title: 'Level Up Reward', client: 'ABC Company', type: 'credits', value: 50, status: 'available', end_date: '2025-12-28' },
  ];

  const columns = [
    { key: 'title', label: 'Promotion', width: '25%' },
    { key: 'client', label: 'Client' },
    {
      key: 'type',
      label: 'Type',
      render: (promo: typeof promotions[0]) => (
        <Badge variant="info">{promo.type.toUpperCase()}</Badge>
      ),
    },
    { key: 'value', label: 'Value' },
    {
      key: 'status',
      label: 'Status',
      render: (promo: typeof promotions[0]) => (
        <Badge variant={promo.status === 'available' ? 'success' : 'default'}>
          {promo.status.toUpperCase()}
        </Badge>
      ),
    },
    { key: 'end_date', label: 'Expires' },
    {
      key: 'actions',
      label: 'Actions',
      render: (promo: typeof promotions[0]) => (
        promo.status === 'available' ? (
          <button className="bg-gold-gradient text-dark-700 font-bold px-4 py-1 rounded text-sm hover:shadow-gold transition-all">
            Claim
          </button>
        ) : (
          <span className="text-gray-500 text-sm">Claimed</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Promotions</h1>
        <p className="text-gray-400">Available promotions from your clients</p>
      </div>

      <DataTable
        data={promotions}
        columns={columns}
        emptyMessage="No promotions available"
      />
    </div>
  );
}

function RewardsSection() {
  const rewards = [
    { id: 1, title: 'Email Verification Bonus', type: 'verification', bonus: 100, status: 'available', expires: 'No expiry' },
    { id: 2, title: 'Welcome to Golden Ace', type: 'welcome', bonus: 50, status: 'claimed', expires: 'Claimed' },
  ];

  const columns = [
    { key: 'title', label: 'Reward', width: '30%' },
    {
      key: 'type',
      label: 'Type',
      render: (reward: typeof rewards[0]) => (
        <Badge variant="purple">{reward.type.toUpperCase()}</Badge>
      ),
    },
    { key: 'bonus', label: 'Bonus Amount' },
    {
      key: 'status',
      label: 'Status',
      render: (reward: typeof rewards[0]) => (
        <Badge variant={reward.status === 'available' ? 'success' : 'default'}>
          {reward.status.toUpperCase()}
        </Badge>
      ),
    },
    { key: 'expires', label: 'Expires' },
    {
      key: 'actions',
      label: 'Actions',
      render: (reward: typeof rewards[0]) => (
        reward.status === 'available' ? (
          <button className="bg-gold-gradient text-dark-700 font-bold px-4 py-1 rounded text-sm hover:shadow-gold transition-all">
            Claim
          </button>
        ) : (
          <span className="text-gray-500 text-sm">Claimed</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Platform Rewards</h1>
        <p className="text-gray-400">Special rewards from Golden Ace platform</p>
      </div>

      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <FaGift className="text-5xl text-gold-500" />
          <div>
            <h3 className="text-xl font-bold text-gold-500 mb-2">Earn More Rewards!</h3>
            <p className="text-gray-400 text-sm">Complete tasks and achievements to unlock exclusive platform rewards.</p>
          </div>
        </div>
      </div>

      <DataTable
        data={rewards}
        columns={columns}
        emptyMessage="No rewards available"
      />
    </div>
  );
}

function ReportsSection() {
  const reports = [
    { id: 1, reported_user: 'player_spam', reason: 'Spam messages', status: 'pending', created_at: '2025-12-23' },
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
  const [activeTab, setActiveTab] = useState<'given' | 'received'>('given');

  const givenReviews = [
    { id: 1, user: 'ABC Company', rating: 5, title: 'Great client!', created_at: '2025-12-20' },
  ];

  const receivedReviews = [
    { id: 1, user: 'ABC Company', rating: 4, title: 'Good player', created_at: '2025-12-22' },
  ];

  const columns = [
    { key: 'user', label: activeTab === 'given' ? 'Client' : 'From' },
    {
      key: 'rating',
      label: 'Rating',
      render: (review: typeof givenReviews[0]) => (
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gold-500">Reviews</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('given')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'given'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Given
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'received'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Received
          </button>
        </div>
      </div>

      <DataTable
        data={activeTab === 'given' ? givenReviews : receivedReviews}
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
            <input
              type="text"
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Your username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email (Optional)</label>
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
