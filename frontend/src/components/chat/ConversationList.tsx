import { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { chatApi } from '@/api/endpoints/chat.api';

interface Friend {
  id: number;
  username: string;
  profile_picture?: string;
  user_type?: string;
}

interface Conversation {
  friend: Friend;
  last_message?: {
    id: number;
    content?: string;
    message_type: string;
    created_at: string;
    sender_id: number;
  };
  unread_count: number;
}

interface ConversationListProps {
  onSelectConversation: (friend: Friend) => void;
  selectedFriendId?: number;
}

export default function ConversationList({ onSelectConversation, selectedFriendId }: ConversationListProps) {
  const { onlineUsers, unreadCounts, getRoomId } = useWebSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        const data = await chatApi.getConversations();
        setConversations(data);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, []);

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) =>
    conv.friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format timestamp
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Get message preview
  const getMessagePreview = (conv: Conversation) => {
    if (!conv.last_message) return 'No messages yet';

    switch (conv.last_message.message_type) {
      case 'image':
        return '📷 Image';
      case 'voice':
        return '🎤 Voice message';
      case 'promotion':
        return '🎁 Promotion';
      default:
        return conv.last_message.content || 'Message';
    }
  };

  // Get total unread for a conversation (combine API + WebSocket)
  const getTotalUnread = (conv: Conversation) => {
    const roomId = getRoomId(conv.friend.id);
    const wsUnread = unreadCounts.get(roomId) || 0;
    return conv.unread_count + wsUnread;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white mb-3">Messages</h2>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full px-4 py-2 pl-10 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isOnline = onlineUsers.get(conv.friend.id)?.is_online ?? false;
            const totalUnread = getTotalUnread(conv);
            const isSelected = selectedFriendId === conv.friend.id;

            return (
              <button
                key={conv.friend.id}
                onClick={() => onSelectConversation(conv.friend)}
                className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-800 transition-colors ${
                  isSelected ? 'bg-gray-800 border-l-2 border-yellow-500' : ''
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center overflow-hidden">
                    {conv.friend.profile_picture ? (
                      <img
                        src={conv.friend.profile_picture}
                        alt={conv.friend.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-900 font-bold text-lg">
                        {conv.friend.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Online indicator */}
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${
                      isOnline ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium truncate">{conv.friend.username}</h3>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTime(conv.last_message?.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-400 truncate">{getMessagePreview(conv)}</p>
                    {totalUnread > 0 && (
                      <span className="flex-shrink-0 ml-2 bg-yellow-500 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
                        {totalUnread > 99 ? '99+' : totalUnread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
