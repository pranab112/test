import { useEffect, useState } from 'react';
import { StatCard } from '@/components/common/StatCard';
import { MdPeople, MdMessage, MdSportsCricket, MdPersonAdd, MdAccessTime } from 'react-icons/md';
import { clientApi, AnalyticsResponse } from '@/api/endpoints/client.api';

export function AnalyticsSection() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await clientApi.getAnalytics();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'signup': return 'text-green-400';
      case 'message': return 'text-blue-400';
      case 'friend_request': return 'text-purple-400';
      case 'review': return 'text-gold-400';
      default: return 'text-gray-400';
    }
  };

  const getActivityDescription = (type: string, description: string) => {
    switch (type) {
      case 'signup': return 'signed up';
      case 'message': return 'sent you a message';
      case 'friend_request': return 'sent a friend request';
      case 'review': return 'left a review';
      default: return description;
    }
  };

  const getPromotionColor = (index: number) => {
    const colors = ['bg-blue-600', 'bg-gold-600', 'bg-green-600'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Analytics</h1>
          <p className="text-gray-400">Track your platform performance and engagement</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Analytics</h1>
          <p className="text-gray-400">Track your platform performance and engagement</p>
        </div>
        <div className="bg-dark-200 border-2 border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-400">{error || 'Failed to load analytics'}</p>
          <button
            type="button"
            onClick={loadAnalytics}
            className="mt-4 px-4 py-2 bg-gold-600 text-white rounded hover:bg-gold-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
          value={analytics.total_friends}
          icon={<MdPeople />}
          trend={analytics.friends_trend}
          color="gold"
        />
        <StatCard
          title="Total Messages"
          value={analytics.total_messages}
          icon={<MdMessage />}
          trend={analytics.messages_trend}
          color="blue"
        />
        <StatCard
          title="Active Players"
          value={analytics.active_players}
          icon={<MdSportsCricket />}
          trend={analytics.players_trend}
          color="green"
        />
        <StatCard
          title="New Signups"
          value={analytics.new_signups}
          icon={<MdPersonAdd />}
          trend={analytics.signups_trend}
          color="purple"
        />
        <StatCard
          title="Avg Session Time"
          value={analytics.avg_session_time}
          icon={<MdAccessTime />}
          trend={analytics.session_time_trend}
          color="red"
        />
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <div className="text-gray-400 text-sm font-medium uppercase tracking-wide mb-4">
            Quick Stats
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Response Rate</span>
              <span className="text-white font-bold">{analytics.quick_stats.response_rate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Player Retention</span>
              <span className="text-white font-bold">{analytics.quick_stats.player_retention}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Avg Rating</span>
              <span className="text-white font-bold">{analytics.quick_stats.avg_rating}/5</span>
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
            {analytics.recent_activity.length > 0 ? (
              analytics.recent_activity.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.activity_type)}`} />
                  <div className="flex-1">
                    <p className="text-white text-sm">
                      <span className="font-medium">{activity.user}</span>
                      <span className="text-gray-400 ml-2">
                        {getActivityDescription(activity.activity_type, activity.description)}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">
                No recent activity
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Promotions */}
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">Top Performing Promotions</h2>
          <div className="space-y-4">
            {analytics.top_promotions.length > 0 ? (
              analytics.top_promotions.map((promo, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium text-sm">{promo.name}</span>
                    <span className="text-gray-400 text-sm">{promo.claims} claims</span>
                  </div>
                  <div className="w-full bg-dark-400 rounded-full h-2">
                    <div
                      className={`${getPromotionColor(idx)} h-2 rounded-full transition-all`}
                      style={{ width: `${Math.min(promo.rate, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">
                No active promotions
              </div>
            )}
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
