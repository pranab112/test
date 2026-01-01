import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage as ChatMessageType } from '@/services/websocket.service';
import { chatApi } from '@/api/endpoints/chat.api';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

interface Friend {
  id: number;
  username: string;
  profile_picture?: string;
  is_online?: boolean;
  last_seen?: string;
  user_type?: string;
}

interface ChatWindowProps {
  friend: Friend;
  onClose?: () => void;
}

export default function ChatWindow({ friend, onClose }: ChatWindowProps) {
  const { user } = useAuth();
  const {
    messages: wsMessages,
    typingIndicators,
    onlineUsers,
    sendTyping,
    markAsRead,
    getRoomId,
    clearUnread,
  } = useWebSocket();

  const [localMessages, setLocalMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const roomId = getRoomId(friend.id);
  const isOnline = onlineUsers.get(friend.id)?.is_online ?? friend.is_online ?? false;
  const roomTyping = typingIndicators.get(roomId) || [];
  const isTyping = roomTyping.some((t) => t.user_id === friend.id);

  // Load message history
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const response = await chatApi.getMessages(friend.id);
        const formattedMessages: ChatMessageType[] = response.messages.map((msg: any) => ({
          id: msg.id,
          sender_id: msg.sender_id,
          sender_name: msg.sender_id === user?.id ? (user?.username || 'You') : friend.username,
          sender_avatar: msg.sender_id === user?.id ? user?.profile_picture : friend.profile_picture,
          receiver_id: msg.receiver_id,
          message_type: msg.message_type,
          content: msg.content,
          file_url: msg.file_url,
          file_name: msg.file_name,
          duration: msg.duration,
          is_read: msg.is_read,
          created_at: msg.created_at,
          room_id: roomId,
          status: msg.is_read ? 'read' as const : 'delivered' as const,
        }));
        setLocalMessages(formattedMessages);
        clearUnread(roomId);
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [friend.id, roomId, user, clearUnread]);

  // Combine local messages with WebSocket messages
  const allMessages = useMemo(() => {
    const wsRoomMessages = wsMessages.get(roomId) || [];
    const combined = [...localMessages];

    // Add WebSocket messages that aren't in local messages
    wsRoomMessages.forEach((wsMsg) => {
      if (!combined.some((m) => m.id === wsMsg.id)) {
        combined.push(wsMsg);
      }
    });

    // Sort by timestamp
    combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return combined;
  }, [localMessages, wsMessages, roomId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  // Mark messages as read when viewing
  useEffect(() => {
    const unreadMessages = allMessages.filter(
      (m) => m.sender_id === friend.id && !m.is_read
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((m) => m.id as number);
      markAsRead(messageIds, friend.id);
    }
  }, [allMessages, friend.id, markAsRead]);

  // Handle sending message
  const handleSendMessage = useCallback(async (content: string, type: 'text' | 'image' | 'voice' = 'text', _fileUrl?: string, _fileName?: string, _duration?: number) => {
    if (!content.trim() && type === 'text') return;

    setIsSending(true);

    try {
      // For text messages, send via API (which also triggers WebSocket)
      if (type === 'text') {
        const formData = new FormData();
        formData.append('receiver_id', friend.id.toString());
        formData.append('content', content);

        const response = await chatApi.sendTextMessage(friend.id, content);

        // Add to local messages
        const newMessage: ChatMessageType = {
          id: response.id,
          sender_id: user?.id || 0,
          sender_name: user?.username || '',
          sender_avatar: user?.profile_picture,
          receiver_id: friend.id,
          message_type: 'text',
          content: content,
          is_read: false,
          created_at: response.created_at || new Date().toISOString(),
          room_id: roomId,
          status: 'sent',
        };

        setLocalMessages((prev) => [...prev, newMessage]);
      }

      // Stop typing indicator
      sendTyping(friend.id, false);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [friend.id, user, roomId, sendTyping]);

  // Handle typing
  const handleTyping = useCallback(() => {
    sendTyping(friend.id, true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(friend.id, false);
    }, 2000);
  }, [friend.id, sendTyping]);

  // Format last seen time
  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return '';
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center overflow-hidden">
              {friend.profile_picture ? (
                <img
                  src={friend.profile_picture}
                  alt={friend.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-900 font-bold text-lg">
                  {friend.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Online indicator */}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${
                isOnline ? 'bg-green-500' : 'bg-gray-500'
              }`}
            />
          </div>
          <div>
            <h3 className="text-white font-semibold">{friend.username}</h3>
            <p className="text-xs text-gray-400">
              {isOnline ? (
                <span className="text-green-400">Online</span>
              ) : (
                <span>Last seen {formatLastSeen(onlineUsers.get(friend.id)?.last_seen || friend.last_seen)}</span>
              )}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Start the conversation with {friend.username}!</p>
          </div>
        ) : (
          allMessages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
              showAvatar={
                index === 0 || allMessages[index - 1]?.sender_id !== message.sender_id
              }
            />
          ))
        )}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator username={friend.username} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        onTyping={handleTyping}
        disabled={isSending}
        receiverId={friend.id}
      />
    </div>
  );
}
