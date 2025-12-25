import { useState } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import toast from 'react-hot-toast';
import {
  MdMessage,
  MdSend,
  MdImage,
  MdMic,
  MdExpandMore,
  MdExpandLess,
  MdContentCopy,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';

interface Message {
  id: number;
  senderId: number;
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface Conversation {
  id: number;
  userId: number;
  username: string;
  avatar?: string;
  userType: 'player' | 'client';
  online: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
  gameCredentials?: {
    username: string;
    password: string;
    gameName: string;
  };
}

export function MessagesSection() {
  const currentUserId = 1; // TODO: Get from auth context

  // TODO: Replace with API call
  const mockConversations: Conversation[] = [
    {
      id: 1,
      userId: 101,
      username: 'player_alex',
      avatar: undefined,
      userType: 'player',
      online: true,
      lastMessage: "Thanks! I'll start playing now.",
      lastMessageTime: '2 min ago',
      unreadCount: 2,
      messages: [
        {
          id: 1,
          senderId: currentUserId,
          content: 'Hi! Here are your game credentials.',
          timestamp: '10:30 AM',
          isRead: true,
        },
        {
          id: 2,
          senderId: 101,
          content: 'Great! Thank you!',
          timestamp: '10:32 AM',
          isRead: true,
        },
        {
          id: 3,
          senderId: 101,
          content: "Thanks! I'll start playing now.",
          timestamp: '10:35 AM',
          isRead: false,
        },
      ],
      gameCredentials: {
        username: 'player_alex_game',
        password: 'SecurePass123!',
        gameName: 'Epic Battle Arena',
      },
    },
    {
      id: 2,
      userId: 102,
      username: 'gamer_mike',
      avatar: undefined,
      userType: 'player',
      online: false,
      lastMessage: 'When can I start?',
      lastMessageTime: '1 hour ago',
      unreadCount: 0,
      messages: [
        {
          id: 1,
          senderId: 102,
          content: 'Hi, I claimed your promotion!',
          timestamp: 'Yesterday',
          isRead: true,
        },
        {
          id: 2,
          senderId: currentUserId,
          content: "Great! I'll set up your account.",
          timestamp: 'Yesterday',
          isRead: true,
        },
        {
          id: 3,
          senderId: 102,
          content: 'When can I start?',
          timestamp: '11:00 AM',
          isRead: true,
        },
      ],
      gameCredentials: {
        username: 'gamer_mike_game',
        password: 'MikePass456#',
        gameName: 'Casino Royale',
      },
    },
    {
      id: 3,
      userId: 103,
      username: 'client_john',
      avatar: undefined,
      userType: 'client',
      online: true,
      lastMessage: 'Thanks for the update!',
      lastMessageTime: '3 hours ago',
      unreadCount: 0,
      messages: [
        {
          id: 1,
          senderId: currentUserId,
          content: 'Hey, wanted to discuss collaboration opportunities.',
          timestamp: '2 days ago',
          isRead: true,
        },
        {
          id: 2,
          senderId: 103,
          content: "Sure! I'm interested.",
          timestamp: '2 days ago',
          isRead: true,
        },
        {
          id: 3,
          senderId: 103,
          content: 'Thanks for the update!',
          timestamp: '9:00 AM',
          isRead: true,
        },
      ],
    },
  ];

  const [conversations, setConversations] = useState(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    mockConversations[0]
  );
  const [messageInput, setMessageInput] = useState('');
  const [showCredentials, setShowCredentials] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) {
      return;
    }

    const newMessage: Message = {
      id: Date.now(),
      senderId: currentUserId,
      content: messageInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
    };

    try {
      // TODO: Replace with actual API call
      // await clientApi.sendMessage(selectedConversation.id, messageInput);
      await new Promise(resolve => setTimeout(resolve, 300));

      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                messages: [...conv.messages, newMessage],
                lastMessage: messageInput,
                lastMessageTime: 'Just now',
              }
            : conv
        )
      );

      setSelectedConversation(prev =>
        prev ? { ...prev, messages: [...prev.messages, newMessage] } : null
      );

      setMessageInput('');
      toast.success('Message sent');
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    }
  };

  const handleCopyCredential = (value: string, type: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${type} copied to clipboard`);
  };

  const handleImageAttach = () => {
    toast.success('Image upload coming soon');
  };

  const handleVoiceMessage = () => {
    toast.success('Voice messages coming soon');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Messages</h1>
        <p className="text-gray-400">Chat with your players and network</p>
      </div>

      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 h-[600px]">
          {/* Conversations Sidebar */}
          <div className="col-span-4 border-r border-gold-700 overflow-y-auto">
            <div className="p-4 border-b border-gold-700 bg-dark-300">
              <h2 className="text-lg font-bold text-gold-500">Conversations</h2>
            </div>
            <div className="divide-y divide-dark-400">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 text-left hover:bg-dark-300 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-dark-300' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={conv.username} size="md" online={conv.online} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white font-medium truncate">{conv.username}</p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="error" size="sm">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">{conv.lastMessage}</p>
                      <p className="text-xs text-gray-500 mt-1">{conv.lastMessageTime}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Panel */}
          <div className="col-span-8 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gold-700 bg-dark-300">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={selectedConversation.username}
                      size="md"
                      online={selectedConversation.online}
                    />
                    <div>
                      <p className="text-white font-medium">{selectedConversation.username}</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={selectedConversation.userType === 'player' ? 'info' : 'purple'}
                          size="sm"
                        >
                          {selectedConversation.userType}
                        </Badge>
                        {selectedConversation.online && (
                          <span className="text-xs text-green-400">Online</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Game Credentials (only for player conversations) */}
                {selectedConversation.userType === 'player' &&
                  selectedConversation.gameCredentials && (
                    <div className="p-4 border-b border-gold-700 bg-dark-300/50">
                      <button
                        onClick={() => setShowCredentials(!showCredentials)}
                        className="flex items-center justify-between w-full text-left mb-2"
                      >
                        <span className="text-sm font-medium text-gold-500">
                          Game Credentials - {selectedConversation.gameCredentials.gameName}
                        </span>
                        {showCredentials ? (
                          <MdExpandLess className="text-gold-500" size={20} />
                        ) : (
                          <MdExpandMore className="text-gold-500" size={20} />
                        )}
                      </button>

                      {showCredentials && (
                        <div className="space-y-3 mt-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-dark-400 px-3 py-2 rounded">
                              <p className="text-xs text-gray-400 mb-1">Username</p>
                              <p className="text-white text-sm font-mono">
                                {selectedConversation.gameCredentials.username}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                handleCopyCredential(
                                  selectedConversation.gameCredentials!.username,
                                  'Username'
                                )
                              }
                              className="bg-gold-600 hover:bg-gold-700 text-dark-700 p-2 rounded transition-colors"
                              title="Copy username"
                            >
                              <MdContentCopy size={16} />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-dark-400 px-3 py-2 rounded">
                              <p className="text-xs text-gray-400 mb-1">Password</p>
                              <p className="text-white text-sm font-mono">
                                {showPassword
                                  ? selectedConversation.gameCredentials.password
                                  : '••••••••••'}
                              </p>
                            </div>
                            <button
                              onClick={() => setShowPassword(!showPassword)}
                              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
                              title={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? (
                                <MdVisibilityOff size={16} />
                              ) : (
                                <MdVisibility size={16} />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                handleCopyCredential(
                                  selectedConversation.gameCredentials!.password,
                                  'Password'
                                )
                              }
                              className="bg-gold-600 hover:bg-gold-700 text-dark-700 p-2 rounded transition-colors"
                              title="Copy password"
                            >
                              <MdContentCopy size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedConversation.messages.map((message) => {
                    const isSent = message.senderId === currentUserId;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isSent
                              ? 'bg-gold-600 text-dark-700'
                              : 'bg-dark-400 text-white'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isSent ? 'text-dark-600' : 'text-gray-500'
                            }`}
                          >
                            {message.timestamp}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gold-700 bg-dark-300">
                  <div className="flex items-end gap-2">
                    <button
                      onClick={handleImageAttach}
                      className="bg-dark-400 hover:bg-dark-500 text-gray-400 p-3 rounded-lg transition-colors"
                      title="Attach image"
                    >
                      <MdImage size={20} />
                    </button>
                    <button
                      onClick={handleVoiceMessage}
                      className="bg-dark-400 hover:bg-dark-500 text-gray-400 p-3 rounded-lg transition-colors"
                      title="Voice message"
                    >
                      <MdMic size={20} />
                    </button>
                    <div className="flex-1">
                      <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      className="bg-gold-600 hover:bg-gold-700 disabled:opacity-50 disabled:cursor-not-allowed text-dark-700 p-3 rounded-lg transition-colors"
                    >
                      <MdSend size={20} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MdMessage className="text-6xl text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
