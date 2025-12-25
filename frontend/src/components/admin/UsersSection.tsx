import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import toast from 'react-hot-toast';
import { MdBlock, MdCheck, MdDelete } from 'react-icons/md';
import { adminApi, type User } from '@/api/endpoints';
import { UserType } from '@/types';

export function UsersSection() {
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
