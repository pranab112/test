import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { FaUserPlus, FaUsers, FaEllipsisV, FaGift } from 'react-icons/fa';
import { MdBlock, MdLockReset, MdWarning } from 'react-icons/md';
import { clientApi, type Player, type PlayerCreateRequest, type BulkPlayerCreate } from '@/api/endpoints';
import { apiClient } from '@/api/client';

export function PlayersSection() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [processingAction, setProcessingAction] = useState<number | null>(null);

  // Confirmation modal state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  const handleBlockPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setShowBlockModal(true);
    setActionMenuId(null);
  };

  const confirmBlockPlayer = async () => {
    if (!selectedPlayer) return;

    const action = selectedPlayer.is_active ? 'block' : 'unblock';
    setProcessingAction(selectedPlayer.id);
    setShowBlockModal(false);

    try {
      await apiClient.patch(`/client/block-player/${selectedPlayer.id}`);
      toast.success(`Player ${selectedPlayer.username} has been ${action}ed`);
      loadPlayers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || `Failed to ${action} player`);
    } finally {
      setProcessingAction(null);
      setSelectedPlayer(null);
    }
  };

  const handleResetPassword = (player: Player) => {
    setSelectedPlayer(player);
    setShowResetPasswordModal(true);
    setActionMenuId(null);
  };

  const confirmResetPassword = async () => {
    if (!selectedPlayer) return;

    setProcessingAction(selectedPlayer.id);
    setShowResetPasswordModal(false);

    try {
      const result = await apiClient.post(`/client/reset-player-password/${selectedPlayer.id}`) as { message: string; temp_password?: string };
      toast.success(`Password reset! New password: ${result.temp_password || `${selectedPlayer.username}@135`}`, { duration: 10000 });
      loadPlayers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setProcessingAction(null);
      setSelectedPlayer(null);
    }
  };

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const data = await clientApi.getMyPlayers();
      setPlayers(data);
    } catch (error) {
      toast.error('Failed to load players');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPlayer = async (data: PlayerCreateRequest) => {
    setRegistering(true);
    try {
      const result = await clientApi.registerPlayer(data);
      toast.success(`Player ${result.username} registered successfully!`);
      if (result.temp_password) {
        toast.success(`Temporary password: ${result.temp_password}`, { duration: 10000 });
      }
      setShowRegisterModal(false);
      loadPlayers();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to register player');
    } finally {
      setRegistering(false);
    }
  };

  const columns = [
    {
      key: 'username',
      label: 'Player',
      render: (player: Player) => (
        <div className="flex items-center gap-3">
          <Avatar name={player.full_name} size="sm" online={player.is_online} />
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
      render: (player: Player) => (
        <span className="font-mono text-sm text-gray-300">{player.user_id}</span>
      ),
    },
    {
      key: 'player_level',
      label: 'Level',
      render: (player: Player) => (
        <Badge variant="info">Level {player.player_level}</Badge>
      ),
    },
    {
      key: 'credits',
      label: 'Credits',
      render: (player: Player) => (
        <span className="font-medium text-gold-500">{player.credits.toLocaleString()}</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (player: Player) => (
        <Badge variant={player.is_active ? 'success' : 'error'} dot>
          {player.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'is_online',
      label: 'Online',
      render: (player: Player) => (
        <Badge variant={player.is_online ? 'success' : 'default'}>
          {player.is_online ? 'Online' : 'Offline'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Registered',
      render: (player: Player) => new Date(player.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (player: Player) => (
        <div className="relative">
          <button
            onClick={() => setActionMenuId(actionMenuId === player.id ? null : player.id)}
            className="p-2 text-gray-400 hover:text-gold-500 transition-colors"
            disabled={processingAction === player.id}
          >
            <FaEllipsisV />
          </button>
          {actionMenuId === player.id && (
            <div className="absolute right-0 top-full mt-1 bg-dark-300 border border-gold-700 rounded-lg shadow-lg z-10 min-w-[160px]">
              <button
                onClick={() => handleBlockPlayer(player)}
                disabled={processingAction === player.id}
                className="w-full px-4 py-2 text-left text-sm hover:bg-dark-400 flex items-center gap-2 text-gray-300 hover:text-white"
              >
                <MdBlock className={player.is_active ? 'text-red-500' : 'text-green-500'} />
                {player.is_active ? 'Block Player' : 'Unblock Player'}
              </button>
              <button
                onClick={() => handleResetPassword(player)}
                disabled={processingAction === player.id}
                className="w-full px-4 py-2 text-left text-sm hover:bg-dark-400 flex items-center gap-2 text-gray-300 hover:text-white"
              >
                <MdLockReset className="text-yellow-500" />
                Reset Password
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500">Player Management</h1>
          <p className="text-gray-400">Total: {players.length} players</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowRegisterModal(true)}
            className="bg-gold-gradient text-dark-700"
          >
            <FaUserPlus className="mr-2" />
            Register Player
          </Button>
          <Button
            onClick={() => setShowBulkModal(true)}
            className="bg-dark-300 text-gold-500 border-2 border-gold-700"
          >
            <FaUsers className="mr-2" />
            Bulk Register
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gold-500">Loading players...</div>
      ) : (
        <DataTable data={players} columns={columns} emptyMessage="No players found" />
      )}

      {/* Register Player Modal */}
      <RegisterPlayerModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onRegister={handleRegisterPlayer}
        isRegistering={registering}
      />

      {/* Bulk Register Modal */}
      <BulkRegisterModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={loadPlayers}
      />

      {/* Block/Unblock Player Confirmation Modal */}
      <Modal
        isOpen={showBlockModal}
        onClose={() => {
          setShowBlockModal(false);
          setSelectedPlayer(null);
        }}
        title={selectedPlayer?.is_active ? 'Block Player' : 'Unblock Player'}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <MdWarning className="text-red-500 text-2xl flex-shrink-0" />
            <p className="text-gray-300">
              Are you sure you want to {selectedPlayer?.is_active ? 'block' : 'unblock'}{' '}
              <span className="text-white font-medium">{selectedPlayer?.username}</span>?
              {selectedPlayer?.is_active && ' They will no longer be able to access the platform.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowBlockModal(false);
                setSelectedPlayer(null);
              }}
              variant="secondary"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBlockPlayer}
              variant="primary"
              fullWidth
              className={selectedPlayer?.is_active ? '!bg-red-600 hover:!bg-red-700' : '!bg-green-600 hover:!bg-green-700'}
            >
              {selectedPlayer?.is_active ? 'Block Player' : 'Unblock Player'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Confirmation Modal */}
      <Modal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setSelectedPlayer(null);
        }}
        title="Reset Player Password"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <MdLockReset className="text-yellow-500 text-2xl flex-shrink-0" />
            <div className="text-gray-300">
              <p>
                Reset password for <span className="text-white font-medium">{selectedPlayer?.username}</span>?
              </p>
              <p className="text-sm mt-1">
                The new password will be: <code className="bg-dark-400 px-2 py-0.5 rounded text-gold-500">{selectedPlayer?.username}@135</code>
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowResetPasswordModal(false);
                setSelectedPlayer(null);
              }}
              variant="secondary"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={confirmResetPassword}
              variant="primary"
              fullWidth
            >
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RegisterPlayerModal({
  isOpen,
  onClose,
  onRegister,
  isRegistering,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (data: PlayerCreateRequest) => void;
  isRegistering: boolean;
}) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [useAutoPassword, setUseAutoPassword] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim()) {
      toast.error('Username and full name are required');
      return;
    }

    onRegister({
      username: username.trim(),
      full_name: fullName.trim(),
      password: useAutoPassword ? undefined : password.trim() || undefined,
      referral_code: referralCode.trim() || undefined,
    });

    // Reset form
    setUsername('');
    setFullName('');
    setPassword('');
    setReferralCode('');
    setUseAutoPassword(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Player">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          required
        />
        <Input
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Enter full name"
          required
        />

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useAutoPassword}
              onChange={(e) => setUseAutoPassword(e.target.checked)}
              className="rounded border-gold-700 bg-dark-300 text-gold-500 focus:ring-gold-500"
            />
            <span className="text-sm text-gray-300">
              Use auto-generated password (username@135)
            </span>
          </label>
        </div>

        {!useAutoPassword && (
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        )}

        <div className="relative">
          <div className="absolute left-3 top-[38px] text-gold-600">
            <FaGift />
          </div>
          <Input
            label="Referral Code (Optional)"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="Enter referral code for bonus credits"
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="button" onClick={onClose} className="flex-1 bg-dark-300">
            Cancel
          </Button>
          <Button type="submit" loading={isRegistering} className="flex-1 bg-gold-gradient text-dark-700">
            Register Player
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BulkRegisterModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [csvText, setCsvText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<BulkPlayerCreate[]>([]);

  const handlePreview = () => {
    const lines = csvText.trim().split('\n').filter(line => line.trim());
    const players: BulkPlayerCreate[] = [];

    for (const line of lines) {
      const [username, fullName] = line.split(',').map(s => s.trim());
      if (username && fullName) {
        players.push({ username, full_name: fullName });
      }
    }

    setPreview(players);
    if (players.length > 0) {
      toast.success(`Previewed ${players.length} players`);
    } else {
      toast.error('No valid players found in CSV');
    }
  };

  const handleBulkRegister = async () => {
    if (preview.length === 0) {
      toast.error('Please preview the CSV first');
      return;
    }

    setProcessing(true);
    try {
      const result = await clientApi.bulkRegisterPlayers(preview);
      toast.success(`Successfully registered ${result.total_created} players!`);
      if (result.total_failed > 0) {
        toast.error(`Failed to register ${result.total_failed} players`);
      }
      onClose();
      onSuccess();
      setCsvText('');
      setPreview([]);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to bulk register');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Register Players">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            CSV Data (Format: username, full name)
          </label>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={10}
            className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono text-sm"
            placeholder="player1, John Doe&#10;player2, Jane Smith&#10;player3, Bob Johnson"
          />
        </div>

        {preview.length > 0 && (
          <div className="bg-dark-300 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2">Preview: {preview.length} players</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {preview.slice(0, 10).map((p, i) => (
                <div key={i} className="text-sm text-gray-300">
                  {i + 1}. {p.username} - {p.full_name}
                </div>
              ))}
              {preview.length > 10 && (
                <div className="text-sm text-gray-500">... and {preview.length - 10} more</div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button type="button" onClick={onClose} className="flex-1 bg-dark-300">
            Cancel
          </Button>
          <Button onClick={handlePreview} className="flex-1 bg-blue-600" disabled={!csvText.trim()}>
            Preview
          </Button>
          <Button
            onClick={handleBulkRegister}
            loading={processing}
            className="flex-1 bg-gold-gradient text-dark-700"
            disabled={preview.length === 0}
          >
            Register All
          </Button>
        </div>
      </div>
    </Modal>
  );
}
