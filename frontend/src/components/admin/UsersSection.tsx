import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { MdBlock, MdCheck, MdDelete, MdLock, MdContentCopy } from 'react-icons/md';
import { adminApi, type User } from '@/api/endpoints';
import { UserType } from '@/types';

export function UsersSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'client' | 'player'>('all');
  const [total, setTotal] = useState(0);

  // Password reset modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

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

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setGeneratedPassword(null);
    setPasswordModalOpen(true);
  };

  const handleResetPassword = async (generateRandom: boolean) => {
    if (!selectedUser) return;

    if (!generateRandom && newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setResettingPassword(true);
    try {
      const result = await adminApi.resetUserPassword(selectedUser.id, {
        new_password: generateRandom ? undefined : newPassword,
        generate_random: generateRandom,
      });

      if (result.temp_password) {
        setGeneratedPassword(result.temp_password);
        toast.success('Password reset successfully! Copy the temporary password below.');
      } else {
        toast.success('Password reset successfully!');
        setPasswordModalOpen(false);
      }
    } catch (error: any) {
      const errorMessage = error?.error?.message || error?.message || 'Failed to reset password';
      toast.error(errorMessage);
    } finally {
      setResettingPassword(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Password copied to clipboard');
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
      render: (user: User) => {
        const isAdmin = user.user_type === 'admin';

        // Don't show any action buttons for admin users (can't modify admins)
        if (isAdmin) {
          return (
            <span className="text-gray-500 text-sm italic">Protected</span>
          );
        }

        return (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openPasswordModal(user)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
              title="Reset Password"
            >
              <MdLock size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleToggleStatus(user.id)}
              className={`${
                user.is_active ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'
              } text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1`}
              title={user.is_active ? 'Deactivate' : 'Activate'}
            >
              {user.is_active ? <MdBlock size={14} /> : <MdCheck size={14} />}
            </button>
            <button
              type="button"
              onClick={() => handleDeleteUser(user.id, user.username)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
              title="Delete User"
            >
              <MdDelete size={14} />
            </button>
          </div>
        );
      },
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

      {/* Password Reset Modal */}
      {passwordModalOpen && selectedUser && (
        <Modal
          isOpen={passwordModalOpen}
          onClose={() => {
            setPasswordModalOpen(false);
            setGeneratedPassword(null);
          }}
          title={`Reset Password for ${selectedUser.username}`}
        >
          <div className="space-y-6">
            {generatedPassword ? (
              // Show generated password
              <div className="space-y-4">
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                  <p className="text-green-400 font-medium mb-2">Password reset successfully!</p>
                  <p className="text-sm text-gray-400">
                    Please share this temporary password with the user. They should change it after logging in.
                  </p>
                </div>
                <div className="bg-dark-400 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Temporary Password:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-dark-300 px-4 py-2 rounded text-gold-500 font-mono text-lg">
                      {generatedPassword}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedPassword)}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      <MdContentCopy size={20} />
                    </button>
                  </div>
                </div>
                <Button onClick={() => setPasswordModalOpen(false)} fullWidth>
                  Done
                </Button>
              </div>
            ) : (
              // Password reset form
              <div className="space-y-4">
                <p className="text-gray-400">
                  Choose how to reset the password for <span className="text-white font-medium">{selectedUser.full_name || selectedUser.username}</span>:
                </p>

                {/* Generate random password option */}
                <div className="bg-dark-300 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Option 1: Generate Random Password</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Generate a secure random password that you can share with the user.
                  </p>
                  <Button
                    onClick={() => handleResetPassword(true)}
                    loading={resettingPassword}
                    variant="primary"
                  >
                    Generate Random Password
                  </Button>
                </div>

                {/* Set specific password option */}
                <div className="bg-dark-300 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Option 2: Set Specific Password</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Set a specific password for the user.
                  </p>
                  <div className="space-y-3">
                    <Input
                      label="New Password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                    />
                    <Button
                      onClick={() => handleResetPassword(false)}
                      loading={resettingPassword}
                      disabled={newPassword.length < 6}
                      variant="secondary"
                    >
                      Set Password
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="secondary" onClick={() => setPasswordModalOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
