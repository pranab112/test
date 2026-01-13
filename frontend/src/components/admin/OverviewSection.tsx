import { useState, useEffect } from 'react';
import { StatCard } from '@/components/common/StatCard';
import toast from 'react-hot-toast';
import { MdPeople, MdCheckCircle, MdFlag } from 'react-icons/md';
import { adminApi } from '@/api/endpoints';

interface OverviewSectionProps {
  onNavigate?: (section: string) => void;
}

export function OverviewSection({ onNavigate }: OverviewSectionProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminApi.getDashboardStats();
      setStats(data);
    } catch (error: any) {
      toast.error('Failed to load dashboard statistics');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-emerald-500">Loading statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-red-500">Failed to load statistics</div>;
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.users.total.toString(),
      icon: <MdPeople />,
      color: 'green' as const,
    },
    {
      title: 'Pending Approvals',
      value: stats.users.pending_approvals.toString(),
      icon: <MdCheckCircle />,
      color: 'blue' as const,
    },
    {
      title: 'Active Reports',
      value: stats.reports.pending.toString(),
      icon: <MdFlag />,
      color: 'red' as const,
    },
    {
      title: 'Total Clients',
      value: stats.users.clients.toString(),
      icon: <MdPeople />,
      color: 'green' as const,
    },
    {
      title: 'Total Players',
      value: stats.users.players.toString(),
      icon: <MdPeople />,
      color: 'purple' as const,
    },
    {
      title: 'Online Users',
      value: stats.users.online.toString(),
      icon: <MdPeople />,
      color: 'green' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-emerald-500 mb-2">Admin Overview</h1>
        <p className="text-gray-400">Welcome to Green Palace Admin Portal</p>
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
        <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-emerald-500 mb-4">Platform Statistics</h2>
          <div className="space-y-3">
            <StatRow label="Active Promotions" value={stats.promotions.active} />
            <StatRow label="Total Claims" value={stats.promotions.total_claims} />
            <StatRow label="Total Messages" value={stats.messages.total} />
            <StatRow label="Today's Messages" value={stats.messages.today} />
            <StatRow label="Total Reviews" value={stats.reviews.total} />
            <StatRow label="Average Rating" value={`${stats.reviews.average_rating}/5`} />
          </div>
        </div>

        <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-emerald-500 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate?.('approvals')}
              className="w-full bg-emerald-gradient text-dark-700 font-bold py-3 px-4 rounded-lg hover:shadow-green transition-all"
            >
              Review Pending Approvals ({stats.users.pending_approvals})
            </button>
            <button
              onClick={() => onNavigate?.('reports')}
              className="w-full bg-dark-300 text-emerald-500 border-2 border-emerald-700 font-bold py-3 px-4 rounded-lg hover:bg-dark-400 transition-all"
            >
              Review Reports ({stats.reports.pending})
            </button>
            <button
              onClick={() => onNavigate?.('broadcast')}
              className="w-full bg-dark-300 text-emerald-500 border-2 border-emerald-700 font-bold py-3 px-4 rounded-lg hover:bg-dark-400 transition-all"
            >
              Send Broadcast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between items-center p-3 bg-dark-300 rounded-lg">
      <span className="text-gray-400">{label}</span>
      <span className="font-bold text-emerald-500">{value}</span>
    </div>
  );
}
