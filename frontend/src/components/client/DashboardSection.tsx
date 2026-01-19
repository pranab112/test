import { useState, useEffect } from 'react';
import { StatCard } from '@/components/common/StatCard';
import toast from 'react-hot-toast';
import {
  MdPeople, MdCardGiftcard, MdGroup, MdAttachMoney,
  MdSmartToy, MdAutorenew, MdVerified, MdSms
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

      {/* Coming Soon Features */}
      <div className="bg-gradient-to-r from-dark-200 to-dark-300 border-2 border-purple-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">*</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-purple-400">Coming Soon</h2>
            <p className="text-gray-400 text-sm">Exciting features in our next update</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI Chat with Player */}
          <div className="bg-dark-400/50 border border-purple-700/50 rounded-lg p-4 hover:border-purple-500 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <MdSmartToy className="text-2xl text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">AI Chat with Players</h3>
                <p className="text-gray-400 text-sm">
                  Intelligent AI assistant to handle player queries 24/7, provide support, and enhance engagement automatically.
                </p>
                <span className="inline-block mt-2 text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded-full">
                  Coming in v2.0
                </span>
              </div>
            </div>
          </div>

          {/* Auto Gamepoint Loadout */}
          <div className="bg-dark-400/50 border border-purple-700/50 rounded-lg p-4 hover:border-purple-500 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <MdAutorenew className="text-2xl text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Auto Gamepoint Loadout</h3>
                <p className="text-gray-400 text-sm">
                  Automatically load gamepoints to players based on their deposits. No manual intervention required.
                </p>
                <span className="inline-block mt-2 text-xs bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded-full">
                  Coming in v2.0
                </span>
              </div>
            </div>
          </div>

          {/* Payment Verification */}
          <div className="bg-dark-400/50 border border-purple-700/50 rounded-lg p-4 hover:border-purple-500 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <MdVerified className="text-2xl text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Payment Verification</h3>
                <p className="text-gray-400 text-sm">
                  Automatic payment verification system to validate player deposits and prevent fraud instantly.
                </p>
                <span className="inline-block mt-2 text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full">
                  Coming in v2.0
                </span>
              </div>
            </div>
          </div>

          {/* SMS Notification */}
          <div className="bg-dark-400/50 border border-purple-700/50 rounded-lg p-4 hover:border-purple-500 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <MdSms className="text-2xl text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">SMS Notifications</h3>
                <p className="text-gray-400 text-sm">
                  Send instant SMS alerts to players for deposits, withdrawals, promotions, and important updates.
                </p>
                <span className="inline-block mt-2 text-xs bg-orange-900/50 text-orange-300 px-2 py-1 rounded-full">
                  Coming in v2.0
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Stay tuned for these powerful features to supercharge your platform!
          </p>
        </div>
      </div>
    </div>
  );
}
