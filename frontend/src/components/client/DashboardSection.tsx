import { useState, useEffect } from 'react';
import { StatCard } from '@/components/common/StatCard';
import toast from 'react-hot-toast';
import {
  MdPeople, MdCardGiftcard, MdGroup
} from 'react-icons/md';
import { FaChartLine, FaUserPlus } from 'react-icons/fa';
import { clientApi, type PlayerStats, type ActivityItem } from '@/api/endpoints';

export function DashboardSection() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    loadDashboardData();
    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, activityData] = await Promise.all([
        clientApi.getPlayerStats(),
        clientApi.getRecentActivity(),
      ]);
      setStats(statsData);
      setRecentActivity(activityData.activities || []);
    } catch (error: any) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-red-500">Failed to load dashboard</div>;
  }

  const statCards = [
    {
      title: 'Total Players',
      value: stats.total_players.toString(),
      icon: <MdPeople />,
      color: 'gold' as const,
    },
    {
      title: 'Active Players',
      value: stats.active_players.toString(),
      icon: <FaUserPlus />,
      color: 'green' as const,
    },
    {
      title: 'Online Players',
      value: stats.online_players.toString(),
      icon: <MdGroup />,
      color: 'blue' as const,
    },
    {
      title: 'Total Credits',
      value: stats.total_credits.toLocaleString(),
      icon: <MdCardGiftcard />,
      color: 'purple' as const,
    },
    {
      title: 'Avg Player Level',
      value: stats.avg_level.toFixed(1),
      icon: <FaChartLine />,
      color: 'gold' as const,
    },
    {
      title: 'Avg Credits',
      value: Math.round(stats.avg_credits).toLocaleString(),
      icon: <MdCardGiftcard />,
      color: 'green' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Client Dashboard</h1>
        <p className="text-gray-400">Overview of your player management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {recentActivity.slice(0, 10).map((activity, index) => (
                <div key={index} className="bg-dark-300 p-3 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 bg-gold-500" />
                    <div className="flex-1">
                      <p className="text-white">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => window.location.hash = '#players'}
              className="w-full bg-gold-gradient text-dark-700 font-bold py-3 px-4 rounded-lg hover:shadow-gold transition-all"
            >
              Manage Players ({stats.total_players})
            </button>
            <button
              onClick={() => window.location.hash = '#players'}
              className="w-full bg-dark-300 text-gold-500 border-2 border-gold-700 font-bold py-3 px-4 rounded-lg hover:bg-dark-400 transition-all"
            >
              Register New Player
            </button>
            <button
              onClick={() => window.location.hash = '#promotions'}
              className="w-full bg-dark-300 text-gold-500 border-2 border-gold-700 font-bold py-3 px-4 rounded-lg hover:bg-dark-400 transition-all"
            >
              Create Promotion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
