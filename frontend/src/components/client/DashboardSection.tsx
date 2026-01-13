import { useState, useEffect } from 'react';
import { StatCard } from '@/components/common/StatCard';
import toast from 'react-hot-toast';
import {
  MdPeople, MdCardGiftcard, MdGroup, MdAttachMoney
} from 'react-icons/md';
import { FaChartLine, FaUserPlus } from 'react-icons/fa';
import { clientApi, type PlayerStats, type ActivityItem } from '@/api/endpoints';
import { apiClient } from '@/api/client';

interface BalanceInfo {
  credits: number;
  dollar_value: number;
}

interface DashboardSectionProps {
  onNavigate?: (section: string) => void;
}

export function DashboardSection({ onNavigate }: DashboardSectionProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [balance, setBalance] = useState<BalanceInfo>({ credits: 0, dollar_value: 0 });

  useEffect(() => {
    loadDashboardData();
    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, activityData, balanceData] = await Promise.all([
        clientApi.getPlayerStats(),
        clientApi.getRecentActivity(),
        apiClient.get('/offers/my-balance') as Promise<BalanceInfo>,
      ]);
      setStats(statsData);
      setRecentActivity(activityData.activities || []);
      setBalance(balanceData);
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
        <div className="text-emerald-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-red-500">Failed to load dashboard</div>;
  }

  const statCards = [
    {
      title: 'My Credits',
      value: balance.credits.toLocaleString(),
      icon: <MdCardGiftcard />,
      color: 'green' as const,
      subtitle: `$${balance.dollar_value.toFixed(2)}`,
    },
    {
      title: 'My Balance (USD)',
      value: `$${balance.dollar_value.toFixed(2)}`,
      icon: <MdAttachMoney />,
      color: 'green' as const,
    },
    {
      title: 'Total Players',
      value: stats.total_players.toString(),
      icon: <MdPeople />,
      color: 'blue' as const,
    },
    {
      title: 'Active Players',
      value: stats.active_players.toString(),
      icon: <FaUserPlus />,
      color: 'purple' as const,
    },
    {
      title: 'Online Players',
      value: stats.online_players.toString(),
      icon: <MdGroup />,
      color: 'green' as const,
    },
    {
      title: 'Avg Player Level',
      value: stats.avg_level.toFixed(1),
      icon: <FaChartLine />,
      color: 'blue' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-emerald-500 mb-2">Client Dashboard</h1>
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
        <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-emerald-500 mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {recentActivity.slice(0, 10).map((activity, index) => (
                <div key={index} className="bg-dark-300 p-3 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 bg-emerald-500" />
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
        <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-emerald-500 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate?.('players')}
              className="w-full bg-emerald-gradient text-dark-700 font-bold py-3 px-4 rounded-lg hover:shadow-green transition-all"
            >
              Manage Players ({stats.total_players})
            </button>
            <button
              onClick={() => onNavigate?.('players')}
              className="w-full bg-dark-300 text-emerald-500 border-2 border-emerald-700 font-bold py-3 px-4 rounded-lg hover:bg-dark-400 transition-all"
            >
              Register New Player
            </button>
            <button
              onClick={() => onNavigate?.('promotions')}
              className="w-full bg-dark-300 text-emerald-500 border-2 border-emerald-700 font-bold py-3 px-4 rounded-lg hover:bg-dark-400 transition-all"
            >
              Create Promotion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
