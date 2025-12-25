import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaBroadcastTower } from 'react-icons/fa';
import { adminApi } from '@/api/endpoints';
import { UserType } from '@/types';

export function BroadcastSection() {
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
