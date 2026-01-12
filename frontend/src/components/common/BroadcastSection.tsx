import { useState, useEffect } from 'react';
import { chatApi, type Broadcast } from '@/api/endpoints';
import toast from 'react-hot-toast';
import {
  MdCampaign,
  MdRefresh,
  MdCheckCircle,
  MdMarkunread,
  MdDoneAll,
} from 'react-icons/md';
import { Button } from './Button';

export function BroadcastSection() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const loadBroadcasts = async () => {
    setLoading(true);
    try {
      const response = await chatApi.getBroadcasts(0, 100);
      setBroadcasts(response.broadcasts);
      setTotal(response.total);
      setUnread(response.unread);
    } catch (error) {
      console.error('Failed to load broadcasts:', error);
      toast.error('Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (broadcastId: number) => {
    try {
      await chatApi.markBroadcastAsRead(broadcastId);
      setBroadcasts(prev =>
        prev.map(b => (b.id === broadcastId ? { ...b, is_read: true } : b))
      );
      setUnread(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await chatApi.markAllBroadcastsAsRead();
      setBroadcasts(prev => prev.map(b => ({ ...b, is_read: true })));
      setUnread(0);
      toast.success('All broadcasts marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-500">Loading broadcasts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2 flex items-center gap-3">
            <MdCampaign className="text-4xl" />
            Broadcasts
          </h1>
          <p className="text-gray-400">
            Announcements from Admin
            {unread > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unread} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <Button onClick={handleMarkAllAsRead} variant="secondary">
              <MdDoneAll className="mr-1" />
              Mark All Read
            </Button>
          )}
          <button
            type="button"
            onClick={loadBroadcasts}
            className="bg-dark-300 hover:bg-dark-400 text-gold-500 p-3 rounded-lg transition-colors"
            title="Refresh"
          >
            <MdRefresh size={20} />
          </button>
        </div>
      </div>

      {/* Broadcasts List */}
      <div className="space-y-4">
        {broadcasts.length === 0 ? (
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-8 text-center">
            <MdCampaign className="text-6xl text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No broadcasts yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Announcements from the admin will appear here
            </p>
          </div>
        ) : (
          broadcasts.map((broadcast) => (
            <div
              key={broadcast.id}
              className={`bg-dark-200 border-2 rounded-lg p-5 transition-all ${
                broadcast.is_read
                  ? 'border-dark-400'
                  : 'border-gold-500 shadow-gold'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MdCampaign
                      className={`text-xl ${
                        broadcast.is_read ? 'text-gray-500' : 'text-gold-500'
                      }`}
                    />
                    <span className="text-xs text-gray-400">
                      {formatTimeAgo(broadcast.created_at)}
                    </span>
                    {!broadcast.is_read && (
                      <span className="bg-gold-500 text-dark-700 text-xs font-bold px-2 py-0.5 rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-lg ${
                      broadcast.is_read ? 'text-gray-400' : 'text-white'
                    }`}
                  >
                    {broadcast.content}
                  </p>
                </div>
                {!broadcast.is_read && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(broadcast.id)}
                    className="text-gray-400 hover:text-green-500 transition-colors p-2"
                    title="Mark as read"
                  >
                    <MdCheckCircle size={24} />
                  </button>
                )}
                {broadcast.is_read && (
                  <MdCheckCircle className="text-green-500 text-xl flex-shrink-0" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      {total > 0 && (
        <div className="bg-dark-300 rounded-lg p-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <MdCampaign className="text-gold-500" />
            <span className="text-gray-400">
              Total: <span className="text-white font-medium">{total}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MdMarkunread className="text-gold-500" />
            <span className="text-gray-400">
              Unread: <span className="text-white font-medium">{unread}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
