import { useState, useEffect, useRef } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import toast from 'react-hot-toast';
import {
  MdMessage,
  MdSend,
  MdImage,
  MdDelete,
} from 'react-icons/md';
import { chatApi, type Conversation, type Message } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export function MessagesSection() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    // Refresh conversations every 30 seconds
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.friend.id);
      // Mark messages as read
      if (selectedConversation.last_message && !selectedConversation.last_message.is_read) {
        chatApi.markMessageAsRead(selectedConversation.last_message.id).catch(console.error);
      }
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const data = await chatApi.getConversations();
      setConversations(data);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load conversations');
      console.error(error);
      setLoading(false);
    }
  };

  const loadMessages = async (friendId: number) => {
    try {
      const data = await chatApi.getMessages(friendId);
      setMessages(data.messages);
    } catch (error) {
      toast.error('Failed to load messages');
      console.error(error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSendingMessage(true);
    try {
      const message = await chatApi.sendTextMessage(
        selectedConversation.friend.id,
        newMessage
      );
      setMessages([...messages, message]);
      setNewMessage('');
      // Update conversation's last message
      const updatedConversations = conversations.map(conv =>
        conv.friend.id === selectedConversation.friend.id
          ? { ...conv, last_message: message }
          : conv
      );
      setConversations(updatedConversations);
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendImage = async (file: File) => {
    if (!selectedConversation) return;

    try {
      const message = await chatApi.sendImageMessage(selectedConversation.friend.id, file);
      setMessages([...messages, message]);
      toast.success('Image sent successfully');
    } catch (error) {
      toast.error('Failed to send image');
      console.error(error);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      await chatApi.deleteMessage(messageId);
      setMessages(messages.filter(m => m.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
      console.error(error);
    }
  };

  const formatMessageTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Conversations List */}
      <div className="lg:col-span-1 bg-dark-200 border-2 border-gold-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gold-700 bg-gradient-to-r from-dark-300 to-dark-200">
          <h2 className="text-xl font-bold text-gold-500">Conversations</h2>
          <p className="text-sm text-gray-400 mt-1">
            {conversations.filter(c => c.unread_count > 0).length} unread
          </p>
        </div>
        <div className="overflow-y-auto h-[calc(100%-80px)]">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No conversations yet</div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.friend.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`w-full p-4 border-b border-dark-400 hover:bg-dark-300 transition-colors text-left ${
                  selectedConversation?.friend.id === conversation.friend.id ? 'bg-dark-300' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    name={conversation.friend.full_name || conversation.friend.username}
                    size="sm"
                    online={conversation.friend.is_online}
                    src={conversation.friend.profile_picture}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white truncate">
                        {conversation.friend.username}
                      </span>
                      {conversation.unread_count > 0 && (
                        <Badge variant="error" className="ml-2">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate mt-1">
                      {conversation.last_message?.content || 'No messages yet'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {conversation.last_message?.created_at
                        ? formatMessageTime(conversation.last_message.created_at)
                        : ''}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      {selectedConversation ? (
        <div className="lg:col-span-2 bg-dark-200 border-2 border-gold-700 rounded-lg overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gold-700 bg-gradient-to-r from-dark-300 to-dark-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  name={selectedConversation.friend.full_name || selectedConversation.friend.username}
                  size="sm"
                  online={selectedConversation.friend.is_online}
                  src={selectedConversation.friend.profile_picture}
                />
                <div>
                  <h3 className="font-bold text-gold-500">
                    {selectedConversation.friend.username}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {selectedConversation.friend.is_online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No messages yet. Start a conversation!</div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isOwnMessage
                          ? 'bg-gold-gradient text-dark-700'
                          : 'bg-dark-300 text-white'
                      }`}
                    >
                      {message.message_type === 'image' && message.file_url ? (
                        <img
                          src={message.file_url}
                          alt="Shared image"
                          className="rounded-lg max-w-full"
                        />
                      ) : (
                        <p className="break-words">{message.content}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-xs ${isOwnMessage ? 'text-dark-500' : 'text-gray-500'}`}>
                          {formatMessageTime(message.created_at)}
                        </p>
                        {isOwnMessage && (
                          <button
                            type="button"
                            title="Delete message"
                            onClick={() => handleDeleteMessage(message.id)}
                            className="text-dark-500 hover:text-red-600 ml-2"
                          >
                            <MdDelete size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gold-700 bg-dark-300">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-dark-200 border border-gold-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500"
                disabled={sendingMessage}
              />
              <label className="cursor-pointer text-gray-400 hover:text-gold-500 transition-colors" title="Send image">
                <MdImage size={24} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  title="Select image to send"
                  onChange={(e) => e.target.files?.[0] && handleSendImage(e.target.files[0])}
                />
              </label>
              <button
                type="button"
                title="Send message"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className="bg-gold-gradient text-dark-700 p-2 rounded-lg hover:shadow-gold transition-all disabled:opacity-50"
              >
                <MdSend size={20} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="lg:col-span-2 bg-dark-200 border-2 border-gold-700 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <MdMessage className="text-6xl text-gold-500 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400">Select a conversation to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}
