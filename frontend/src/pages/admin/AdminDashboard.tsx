import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/common/StatCard';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { Modal } from '@/components/common/Modal';
import toast from 'react-hot-toast';
import {
  MdPeople, MdCheckCircle, MdFlag, MdMessage, MdStar, MdDelete, MdBlock, MdCheck
} from 'react-icons/md';
import { FaGift, FaBroadcastTower, FaUserCheck, FaUserSlash } from 'react-icons/fa';
import { adminApi, type User, type Report, type Review, type Promotion } from '@/api/endpoints';
import { UserType } from '@/types';

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview');

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection />;
      case 'users':
        return <UsersSection />;
      case 'approvals':
        return <ApprovalsSection />;
      case 'messages':
        return <MessagesSection />;
      case 'promotions':
        return <PromotionsSection />;
      case 'reports':
        return <ReportsSection />;
      case 'reviews':
        return <ReviewsSection />;
      case 'offers':
        return <OffersSection />;
      case 'broadcast':
        return <BroadcastSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderContent()}
    </DashboardLayout>
  );
}

function OverviewSection() {
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
        <div className="text-gold-500">Loading statistics...</div>
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
      color: 'gold' as const,
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
      color: 'gold' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Admin Overview</h1>
        <p className="text-gray-400">Welcome to Golden Ace Admin Portal</p>
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
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">Platform Statistics</h2>
          <div className="space-y-3">
            <StatRow label="Active Promotions" value={stats.promotions.active} />
            <StatRow label="Total Claims" value={stats.promotions.total_claims} />
            <StatRow label="Total Messages" value={stats.messages.total} />
            <StatRow label="Today's Messages" value={stats.messages.today} />
            <StatRow label="Total Reviews" value={stats.reviews.total} />
            <StatRow label="Average Rating" value={`${stats.reviews.average_rating}/5`} />
          </div>
        </div>

        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => window.location.hash = '#approvals'}
              className="w-full bg-gold-gradient text-dark-700 font-bold py-3 px-4 rounded-lg hover:shadow-gold transition-all"
            >
              Review Pending Approvals ({stats.users.pending_approvals})
            </button>
            <button
              onClick={() => window.location.hash = '#reports'}
              className="w-full bg-dark-300 text-gold-500 border-2 border-gold-700 font-bold py-3 px-4 rounded-lg hover:bg-dark-400 transition-all"
            >
              Review Reports ({stats.reports.pending})
            </button>
            <button
              onClick={() => window.location.hash = '#broadcast'}
              className="w-full bg-dark-300 text-gold-500 border-2 border-gold-700 font-bold py-3 px-4 rounded-lg hover:bg-dark-400 transition-all"
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
      <span className="font-bold text-gold-500">{value}</span>
    </div>
  );
}

function UsersSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'client' | 'player'>('all');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers({
        user_type: filter === 'all' ? undefined : filter as UserType,
        limit: 100,
      });
      setUsers(data.users);
      setTotal(data.total);
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: number) => {
    try {
      await adminApi.toggleUserStatus(userId);
      toast.success('User status updated');
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminApi.deleteUser(userId);
      toast.success('User deleted successfully');
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const columns = [
    {
      key: 'username',
      label: 'User',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <Avatar name={user.full_name} size="sm" online={user.is_online} />
          <div>
            <div className="font-medium text-white">{user.username}</div>
            <div className="text-xs text-gray-400">{user.full_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'user_type',
      label: 'Type',
      render: (user: User) => (
        <Badge variant={user.user_type === 'client' ? 'info' : 'default'}>
          {user.user_type.toUpperCase()}
        </Badge>
      ),
    },
    { key: 'email', label: 'Email' },
    {
      key: 'is_active',
      label: 'Status',
      render: (user: User) => (
        <Badge variant={user.is_active ? 'success' : 'error'} dot>
          {user.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'is_approved',
      label: 'Approved',
      render: (user: User) => (
        <Badge variant={user.is_approved ? 'success' : 'warning'}>
          {user.is_approved ? 'Yes' : 'Pending'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (user: User) => new Date(user.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user: User) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleToggleStatus(user.id)}
            className={`${
              user.is_active ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'
            } text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1`}
            title={user.is_active ? 'Deactivate' : 'Activate'}
          >
            {user.is_active ? <MdBlock size={14} /> : <MdCheck size={14} />}
          </button>
          <button
            onClick={() => handleDeleteUser(user.id, user.username)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
            title="Delete User"
          >
            <MdDelete size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500">User Management</h1>
          <p className="text-gray-400">Total: {total} users</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('client')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'client'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Clients
          </button>
          <button
            onClick={() => setFilter('player')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'player'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Players
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gold-500">Loading users...</div>
      ) : (
        <DataTable
          data={users}
          columns={columns}
          emptyMessage="No users found"
        />
      )}
    </div>
  );
}

function ApprovalsSection() {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPendingApprovals();
      setPendingUsers(data.pending_users);
    } catch (error) {
      toast.error('Failed to load pending approvals');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number, username: string) => {
    try {
      await adminApi.approveUser(userId);
      toast.success(`${username} approved successfully!`);
      loadPendingApprovals();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to approve user');
    }
  };

  const handleReject = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to reject ${username}?`)) {
      return;
    }

    try {
      await adminApi.rejectUser(userId);
      toast.success(`${username} rejected`);
      loadPendingApprovals();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to reject user');
    }
  };

  const columns = [
    {
      key: 'username',
      label: 'User',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <Avatar name={user.full_name} size="sm" />
          <div>
            <div className="font-medium text-white">{user.username}</div>
            <div className="text-xs text-gray-400">{user.full_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'user_type',
      label: 'Type',
      render: (user: User) => (
        <Badge variant={user.user_type === 'client' ? 'info' : 'default'}>
          {user.user_type.toUpperCase()}
        </Badge>
      ),
    },
    { key: 'email', label: 'Email' },
    {
      key: 'company_name',
      label: 'Company',
      render: (user: User) => user.company_name || '-',
    },
    {
      key: 'created_at',
      label: 'Requested',
      render: (user: User) => new Date(user.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user: User) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleApprove(user.id, user.username)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
          >
            <FaUserCheck size={14} />
            Approve
          </button>
          <button
            onClick={() => handleReject(user.id, user.username)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
          >
            <FaUserSlash size={14} />
            Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Pending Approvals</h1>
        <p className="text-gray-400">Review and approve new user registrations</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gold-500">Loading pending approvals...</div>
      ) : (
        <DataTable
          data={pendingUsers}
          columns={columns}
          emptyMessage="No pending approvals"
        />
      )}
    </div>
  );
}

function MessagesSection() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getMessages({ limit: 50 });
      setMessages(data.messages);
    } catch (error) {
      toast.error('Failed to load messages');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gold-500">Messages</h1>
        <div className="text-center py-12 text-gold-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">System Messages</h1>
        <p className="text-gray-400">Total: {messages.length} messages</p>
      </div>

      {messages.length === 0 ? (
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
          <MdMessage className="text-6xl text-gold-500 mx-auto mb-4" />
          <p className="text-gray-400">No messages found</p>
        </div>
      ) : (
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {messages.map((msg) => (
              <div key={msg.id} className="bg-dark-300 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm text-gray-400">
                    From: <span className="text-gold-500">{msg.sender?.username || 'Unknown'}</span>
                    {' → '}
                    To: <span className="text-gold-500">{msg.receiver?.username || 'Unknown'}</span>
                  </div>
                  <Badge variant={msg.is_read ? 'default' : 'warning'}>
                    {msg.is_read ? 'Read' : 'Unread'}
                  </Badge>
                </div>
                <p className="text-white">{msg.content}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PromotionsSection() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPromotions({ limit: 100 });
      setPromotions(data.promotions);
      setTotal(data.total);
    } catch (error) {
      toast.error('Failed to load promotions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPromotion = async (promotionId: number, title: string) => {
    if (!confirm(`Are you sure you want to cancel the promotion "${title}"?`)) {
      return;
    }

    try {
      await adminApi.cancelPromotion(promotionId);
      toast.success('Promotion cancelled');
      loadPromotions();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to cancel promotion');
    }
  };

  const columns = [
    { key: 'title', label: 'Promotion' },
    {
      key: 'promotion_type',
      label: 'Type',
      render: (promo: Promotion) => (
        <Badge variant="info">{promo.promotion_type.toUpperCase()}</Badge>
      ),
    },
    { key: 'value', label: 'Value' },
    {
      key: 'total_claims',
      label: 'Claims',
      render: (promo: Promotion) => promo.total_claims || 0,
    },
    {
      key: 'status',
      label: 'Status',
      render: (promo: Promotion) => (
        <Badge
          variant={
            promo.status === 'active' ? 'success' :
            promo.status === 'cancelled' ? 'error' : 'default'
          }
          dot
        >
          {promo.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'end_date',
      label: 'End Date',
      render: (promo: Promotion) => new Date(promo.end_date).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (promo: Promotion) => (
        promo.status === 'active' ? (
          <button
            onClick={() => handleCancelPromotion(promo.id, promo.title)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        ) : (
          <span className="text-gray-500 text-sm">-</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Client Promotions</h1>
        <p className="text-gray-400">Monitor client-created promotions - Total: {total}</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gold-500">Loading promotions...</div>
      ) : (
        <DataTable
          data={promotions}
          columns={columns}
          emptyMessage="No promotions found"
        />
      )}
    </div>
  );
}

function ReportsSection() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getReports({ limit: 100 });
      setReports(data.reports);
    } catch (error) {
      toast.error('Failed to load reports');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: number, status: string, notes?: string) => {
    try {
      await adminApi.updateReportStatus(reportId, status, notes);
      toast.success('Report status updated');
      setShowModal(false);
      setSelectedReport(null);
      loadReports();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update report status');
    }
  };

  const columns = [
    {
      key: 'reporter',
      label: 'Reporter',
      render: (report: Report) => report.reporter?.username || 'Unknown',
    },
    {
      key: 'reported_user',
      label: 'Reported User',
      render: (report: Report) => report.reported_user?.username || 'Unknown',
    },
    { key: 'reason', label: 'Reason', width: '30%' },
    {
      key: 'status',
      label: 'Status',
      render: (report: Report) => (
        <Badge
          variant={
            report.status === 'pending' ? 'warning' :
            report.status === 'resolved' ? 'success' : 'default'
          }
        >
          {report.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (report: Report) => new Date(report.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (report: Report) => (
        <button
          onClick={() => {
            setSelectedReport(report);
            setShowModal(true);
          }}
          className="bg-gold-600 hover:bg-gold-700 text-dark-700 px-3 py-1 rounded text-sm font-medium transition-colors"
        >
          Review
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Reports</h1>
        <p className="text-gray-400">Review user reports and violations</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gold-500">Loading reports...</div>
      ) : (
        <DataTable
          data={reports}
          columns={columns}
          emptyMessage="No reports found"
        />
      )}

      {selectedReport && (
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedReport(null);
          }}
          title="Review Report"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reporter</label>
              <p className="text-white">{selectedReport.reporter?.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reported User</label>
              <p className="text-white">{selectedReport.reported_user?.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
              <p className="text-white">{selectedReport.reason}</p>
            </div>
            {selectedReport.description && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <p className="text-white">{selectedReport.description}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Current Status</label>
              <Badge variant={selectedReport.status === 'pending' ? 'warning' : 'success'}>
                {selectedReport.status.toUpperCase()}
              </Badge>
            </div>
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => handleUpdateStatus(selectedReport.id, 'reviewed')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Mark as Reviewed
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedReport.id, 'resolved', 'Resolved by admin')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Mark as Resolved
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedReport.id, 'dismissed', 'Report dismissed')}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getReviews({ limit: 100 });
      setReviews(data.reviews);
    } catch (error) {
      toast.error('Failed to load reviews');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      await adminApi.deleteReview(reviewId);
      toast.success('Review deleted');
      loadReviews();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete review');
    }
  };

  const columns = [
    {
      key: 'reviewer',
      label: 'Reviewer',
      render: (review: Review) => review.reviewer?.username || 'Unknown',
    },
    {
      key: 'reviewee',
      label: 'Reviewee',
      render: (review: Review) => review.reviewee?.username || 'Unknown',
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (review: Review) => (
        <div className="flex items-center gap-1">
          <MdStar className="text-gold-500" />
          <span className="font-medium">{review.rating}/5</span>
        </div>
      ),
    },
    { key: 'title', label: 'Title', width: '30%' },
    {
      key: 'created_at',
      label: 'Date',
      render: (review: Review) => new Date(review.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (review: Review) => (
        <button
          onClick={() => handleDeleteReview(review.id)}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
        >
          <MdDelete size={14} />
          Delete
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Reviews</h1>
        <p className="text-gray-400">Monitor platform reviews</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gold-500">Loading reviews...</div>
      ) : (
        <DataTable
          data={reviews}
          columns={columns}
          emptyMessage="No reviews found"
        />
      )}
    </div>
  );
}

function OffersSection() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Platform Offers</h1>
          <p className="text-gray-400">Manage global platform offers and rewards</p>
        </div>
      </div>

      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-12 text-center">
        <FaGift className="text-6xl text-gold-500 mx-auto mb-4" />
        <p className="text-gray-400">Platform offers management coming soon</p>
      </div>
    </div>
  );
}

function BroadcastSection() {
  const [targetAudience, setTargetAudience] = useState<'all' | 'client' | 'player'>('all');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (!confirm(`Send broadcast to ${targetAudience === 'all' ? 'all users' : `all ${targetAudience}s`}?`)) {
      return;
    }

    setSending(true);
    try {
      const result = await adminApi.broadcastMessage(
        message,
        targetAudience === 'all' ? undefined : targetAudience as UserType
      );
      toast.success(`Broadcast sent to ${result.recipients} users!`);
      setMessage('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Broadcast Message</h1>
        <p className="text-gray-400">Send announcements to all users or specific groups</p>
      </div>

      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value as any)}
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="all">All Users</option>
              <option value="client">All Clients</option>
              <option value="player">All Players</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Message Content</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Enter your broadcast message..."
            />
          </div>
          <button
            onClick={handleSendBroadcast}
            disabled={sending || !message.trim()}
            className="w-full bg-gold-gradient text-dark-700 font-bold py-3 rounded-lg hover:shadow-gold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaBroadcastTower />
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
}
