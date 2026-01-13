import { useState, useEffect } from 'react';
import { Badge } from '@/components/common/Badge';
import toast from 'react-hot-toast';
import { MdMessage } from 'react-icons/md';
import { adminApi } from '@/api/endpoints';

export function MessagesSection() {
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
        <h1 className="text-3xl font-bold text-emerald-500">Messages</h1>
        <div className="text-center py-12 text-emerald-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-emerald-500 mb-2">System Messages</h1>
        <p className="text-gray-400">Total: {messages.length} messages</p>
      </div>

      {messages.length === 0 ? (
        <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-12 text-center">
          <MdMessage className="text-6xl text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-400">No messages found</p>
        </div>
      ) : (
        <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-6">
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {messages.map((msg) => (
              <div key={msg.id} className="bg-dark-300 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm text-gray-400">
                    From: <span className="text-emerald-500">{msg.sender?.username || 'Unknown'}</span>
                    {' → '}
                    To: <span className="text-emerald-500">{msg.receiver?.username || 'Unknown'}</span>
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
