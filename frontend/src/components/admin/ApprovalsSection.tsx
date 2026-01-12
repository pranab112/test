import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { FaUserCheck, FaUserSlash } from 'react-icons/fa';
import { MdWarning } from 'react-icons/md';
import { adminApi, type User } from '@/api/endpoints';

export function ApprovalsSection() {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Reject confirmation modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingRejectUser, setPendingRejectUser] = useState<{ id: number; username: string } | null>(null);

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

  const handleReject = (userId: number, username: string) => {
    setPendingRejectUser({ id: userId, username });
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!pendingRejectUser) return;

    try {
      await adminApi.rejectUser(pendingRejectUser.id);
      toast.success(`${pendingRejectUser.username} rejected`);
      loadPendingApprovals();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to reject user');
    } finally {
      setShowRejectModal(false);
      setPendingRejectUser(null);
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

      {/* Reject Confirmation Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setPendingRejectUser(null);
        }}
        title="Reject User"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <MdWarning className="text-red-500 text-2xl flex-shrink-0" />
            <p className="text-gray-300">
              Are you sure you want to reject{' '}
              <span className="text-white font-medium">{pendingRejectUser?.username}</span>?
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowRejectModal(false);
                setPendingRejectUser(null);
              }}
              variant="secondary"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={confirmReject}
              variant="primary"
              fullWidth
              className="!bg-red-600 hover:!bg-red-700"
            >
              Reject User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
