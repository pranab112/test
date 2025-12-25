import { StatCard } from '@/components/common/StatCard';
import { MdPeople, MdMessage, MdSportsCricket, MdPersonAdd, MdAccessTime } from 'react-icons/md';

export function AnalyticsSection() {
  // TODO: Replace with API call
  const mockAnalytics = {
    totalFriends: 24,
    totalMessages: 156,
    activePlayers: 12,
    newSignups: 8,
    avgSessionTime: '2.5h',
    friendsTrend: { value: '+12%', isPositive: true },
    messagesTrend: { value: '+24%', isPositive: true },
    playersTrend: { value: '+8%', isPositive: true },
    signupsTrend: { value: '+15%', isPositive: true },
    sessionTimeTrend: { value: '+0.3h', isPositive: true },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Analytics</h1>
        <p className="text-gray-400">Track your platform performance and engagement</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Friends"
          value={mockAnalytics.totalFriends}
          icon={<MdPeople />}
          trend={mockAnalytics.friendsTrend}
          color="gold"
        />
        <StatCard
          title="Total Messages"
          value={mockAnalytics.totalMessages}
          icon={<MdMessage />}
          trend={mockAnalytics.messagesTrend}
          color="blue"
        />
        <StatCard
          title="Active Players"
          value={mockAnalytics.activePlayers}
          icon={<MdSportsCricket />}
          trend={mockAnalytics.playersTrend}
          color="green"
        />
        <StatCard
          title="New Signups"
          value={mockAnalytics.newSignups}
          icon={<MdPersonAdd />}
          trend={mockAnalytics.signupsTrend}
          color="purple"
        />
        <StatCard
          title="Avg Session Time"
          value={mockAnalytics.avgSessionTime}
          icon={<MdAccessTime />}
          trend={mockAnalytics.sessionTimeTrend}
          color="red"
        />
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <div className="text-gray-400 text-sm font-medium uppercase tracking-wide mb-4">
            Quick Stats
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Response Rate</span>
              <span className="text-white font-bold">94%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Player Retention</span>
              <span className="text-white font-bold">87%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Avg Rating</span>
              <span className="text-white font-bold">4.8/5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {[
              { type: 'signup', user: 'player_alex', time: '5 min ago', color: 'text-green-400' },
              { type: 'message', user: 'gamer_mike', time: '15 min ago', color: 'text-blue-400' },
              { type: 'friend', user: 'pro_player_99', time: '1 hour ago', color: 'text-purple-400' },
              { type: 'review', user: 'casual_gamer', time: '2 hours ago', color: 'text-gold-400' },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${activity.color}`} />
                <div className="flex-1">
                  <p className="text-white text-sm">
                    <span className="font-medium">{activity.user}</span>
                    <span className="text-gray-400 ml-2">
                      {activity.type === 'signup' && 'signed up'}
                      {activity.type === 'message' && 'sent you a message'}
                      {activity.type === 'friend' && 'sent a friend request'}
                      {activity.type === 'review' && 'left a review'}
                    </span>
                  </p>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Promotions */}
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">Top Performing Promotions</h2>
          <div className="space-y-4">
            {[
              { name: 'Welcome Bonus', claims: 45, rate: 75, color: 'bg-blue-600' },
              { name: 'Holiday Special', claims: 67, rate: 85, color: 'bg-gold-600' },
              { name: 'Weekend Bonus', claims: 23, rate: 60, color: 'bg-green-600' },
            ].map((promo, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium text-sm">{promo.name}</span>
                  <span className="text-gray-400 text-sm">{promo.claims} claims</span>
                </div>
                <div className="w-full bg-dark-400 rounded-full h-2">
                  <div
                    className={`${promo.color} h-2 rounded-full transition-all`}
                    style={{ width: `${promo.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Player Engagement Chart Placeholder */}
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gold-500 mb-4">Player Engagement Over Time</h2>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-dark-400 rounded-lg">
          <div className="text-center">
            <p className="text-gray-400 mb-2">Chart visualization coming soon</p>
            <p className="text-sm text-gray-500">Integration with charting library pending</p>
          </div>
        </div>
      </div>
    </div>
  );
}
