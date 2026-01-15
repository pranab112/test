import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { StatCard } from '@/components/common/StatCard';
import toast from 'react-hot-toast';
import { MdCheckCircle, MdCancel, MdPerson, MdHourglassEmpty, MdWarning } from 'react-icons/md';
import { apiClient } from '@/api/client';

interface PendingPlayer {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  user_id: string;
  created_at: string;
  player_level: number;
  credits: number;
  profile_picture?: string;
}

export function ApprovalsSection() {
  const [pendingPlayers, setPendingPlayers] = useState<PendingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Reject confirmation modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingRejectPlayer, setPendingRejectPlayer] = useState<{ id: number; username: string } | null>(null);

  useEffect(() => {
    loadPendingPlayers();
  }, []);

  const loadPendingPlayers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/client/pending-players') as PendingPlayer[];
      setPendingPlayers(data);
    } catch (error) {
      toast.error('Failed to load pending players');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (playerId: number) => {
    setProcessingId(playerId);
    try {
      await apiClient.patch(`/client/approve-player/${playerId}`);
      toast.success('Player approved successfully!');
      loadPendingPlayers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to approve player');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (playerId: number, username: string) => {
    setPendingRejectPlayer({ id: playerId, username });
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!pendingRejectPlayer) return;

    setProcessingId(pendingRejectPlayer.id);
    setShowRejectModal(false);

    try {
      await apiClient.patch(`/client/reject-player/${pendingRejectPlayer.id}`);
      toast.success('Player registration rejected');
      loadPendingPlayers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to reject player');
    } finally {
      setProcessingId(null);
      setPendingRejectPlayer(null);
    }
  };

  const columns = [
    {
      key: 'username',
      label: 'Player',
      render: (player: PendingPlayer) => (
        <div className="flex items-center gap-3">
          <Avatar name={player.full_name} size="sm" />
          <div>
            <div className="font-medium text-white">{player.username}</div>
            <div className="text-xs text-gray-400">{player.full_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'user_id',
      label: 'Player ID',
      render: (player: PendingPlayer) => (
        <span className="font-mono text-sm text-gray-300">{player.user_id}</span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (player: PendingPlayer) => (
        <span className="text-gray-300">{player.email || 'N/A'}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Registered',
      render: (player: PendingPlayer) => (
        <span className="text-gray-300">
          {new Date(player.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (player: PendingPlayer) => (
        <div className="flex gap-2">
          <Button
            onClick={() => handleApprove(player.id)}
            disabled={processingId === player.id}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm"
          >
            <MdCheckCircle className="mr-1" />
            Approve
          </Button>
          <Button
            onClick={() => handleReject(player.id, player.username)}
            disabled={processingId === player.id}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-sm"
          >
            <MdCancel className="mr-1" />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-emerald-500">Player Approvals</h1>
        <p className="text-gray-400">Review and approve player registrations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Pending Approvals"
          value={pendingPlayers.length}
          icon={<MdHourglassEmpty />}
          color="warning"
        />
        <StatCard
          title="Status"
          value={pendingPlayers.length > 0 ? 'Action Required' : 'All Clear'}
          icon={<MdPerson />}
          color={pendingPlayers.length > 0 ? 'warning' : 'green'}
        />
      </div>

      {/* Pending Alert */}
      {pendingPlayers.length > 0 && (
        <div className="bg-yellow-900/30 border-2 border-yellow-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <MdHourglassEmpty className="text-2xl text-yellow-500 animate-pulse" />
            <div>
              <p className="text-yellow-400 font-bold">
                {pendingPlayers.length} player{pendingPlayers.length > 1 ? 's' : ''} waiting for approval
              </p>
              <p className="text-sm text-gray-400">
                These players registered under your account and need your approval to access the platform
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-emerald-500">Loading pending players...</div>
      ) : pendingPlayers.length === 0 ? (
        <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-12 text-center">
          <MdCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <p className="text-xl text-white font-bold mb-2">All Clear!</p>
          <p className="text-gray-400">No pending player approvals</p>
        </div>
      ) : (
        <DataTable data={pendingPlayers} columns={columns} emptyMessage="No pending players" />
      )}

      {/* Reject Confirmation Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setPendingRejectPlayer(null);
        }}
        title="Reject Player Registration"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <MdWarning className="text-red-500 text-2xl flex-shrink-0" />
            <p className="text-gray-300">
              Are you sure you want to reject the registration for{' '}
              <span className="text-white font-medium">{pendingRejectPlayer?.username}</span>?
              This will delete their account.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowRejectModal(false);
                setPendingRejectPlayer(null);
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
              Reject Registration
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
