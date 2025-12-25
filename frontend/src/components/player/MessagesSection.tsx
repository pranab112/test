import { useState } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { MdMessage, MdSend, MdContentCopy, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { FaKey, FaUser } from 'react-icons/fa';

interface Message {
  id: number;
  sender: string;
  sender_name: string;
  message: string;
  timestamp: string;
  is_own: boolean;
}

interface Conversation {
  id: number;
  username: string;
  full_name: string;
  is_online: boolean;
  unread: number;
  last_message: string;
  last_message_time: string;
}

interface ClientCredentials {
  client_name: string;
  game_name: string;
  username: string;
  password: string;
  login_url?: string;
}

// TODO: Replace with API data
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    username: 'client_abc',
    full_name: 'ABC Gaming Company',
    is_online: true,
    unread: 2,
    last_message: 'Your bonus has been credited',
    last_message_time: '5m ago',
  },
  {
    id: 2,
    username: 'player_john',
    full_name: 'John Doe',
    is_online: false,
    unread: 0,
    last_message: 'Thanks for the help!',
    last_message_time: '2h ago',
  },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: 1,
    sender: 'client_abc',
    sender_name: 'ABC Gaming Company',
    message: 'Welcome to our platform!',
    timestamp: '10:30 AM',
    is_own: false,
  },
  {
    id: 2,
    sender: 'me',
    sender_name: 'You',
    message: 'Thank you! Excited to get started.',
    timestamp: '10:32 AM',
    is_own: true,
  },
  {
    id: 3,
    sender: 'client_abc',
    sender_name: 'ABC Gaming Company',
    message: 'Your bonus has been credited',
    timestamp: '10:35 AM',
    is_own: false,
  },
];

const MOCK_CREDENTIALS: ClientCredentials[] = [
  {
    client_name: 'ABC Gaming Company',
    game_name: 'Fire Kirin',
    username: 'player_12345',
    password: 'demo_pass_123',
    login_url: 'https://firekirin.com',
  },
  {
    client_name: 'ABC Gaming Company',
    game_name: 'Game Vault',
    username: 'vault_user_789',
    password: 'vault_secure_456',
    login_url: 'https://gamevault.com',
  },
];

export function MessagesSection() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    setSending(true);
    // TODO: API call to send message
    const message: Message = {
      id: messages.length + 1,
      sender: 'me',
      sender_name: 'You',
      message: newMessage,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      is_own: true,
    };

    setTimeout(() => {
      setMessages([...messages, message]);
      setNewMessage('');
      setSending(false);
      toast.success('Message sent');
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold-500 mb-2">Messages</h1>
        <p className="text-gray-400">Chat with clients and friends</p>
      </div>

      {/* Client Credentials Section */}
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gold-500 mb-4 flex items-center gap-2">
          <FaKey className="text-2xl" />
          Client Game Credentials
        </h2>
        <p className="text-gray-400 mb-4 text-sm">
          Your login credentials for client games. Keep these secure!
        </p>
        <div className="space-y-4">
          {MOCK_CREDENTIALS.map((cred, index) => (
            <CredentialCard key={index} credential={cred} />
          ))}
        </div>
      </div>

      {/* Messages Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-dark-300 to-dark-200 border-b border-gold-700">
              <h2 className="text-lg font-bold text-gold-500">Conversations</h2>
            </div>
            <div className="divide-y divide-dark-400 max-h-[600px] overflow-y-auto">
              {MOCK_CONVERSATIONS.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 text-left transition-colors ${
                    selectedConversation?.id === conv.id
                      ? 'bg-dark-400'
                      : 'hover:bg-dark-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={conv.full_name} size="sm" online={conv.is_online} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-white truncate">{conv.username}</p>
                        {conv.unread > 0 && (
                          <Badge variant="error" size="sm">{conv.unread}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{conv.last_message}</p>
                      <p className="text-xs text-gray-500 mt-1">{conv.last_message_time}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2">
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg overflow-hidden h-[600px] flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 bg-gradient-to-r from-dark-300 to-dark-200 border-b border-gold-700">
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedConversation.full_name} size="sm" online={selectedConversation.is_online} />
                    <div>
                      <p className="font-bold text-white">{selectedConversation.username}</p>
                      <p className="text-xs text-gray-400">{selectedConversation.full_name}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${msg.is_own ? 'order-2' : 'order-1'}`}>
                        <div className={`rounded-lg p-3 ${
                          msg.is_own
                            ? 'bg-gold-gradient text-dark-700'
                            : 'bg-dark-300 text-white'
                        }`}>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                        <p className={`text-xs text-gray-500 mt-1 ${
                          msg.is_own ? 'text-right' : 'text-left'
                        }`}>
                          {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 bg-dark-300 border-t border-gold-700">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      disabled={sending}
                      className="flex-1 bg-dark-200 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      loading={sending}
                      variant="primary"
                    >
                      <MdSend className="text-xl" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MdMessage className="text-6xl text-gray-600 mx-auto mb-4" />
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

function CredentialCard({ credential }: { credential: ClientCredentials }) {
  const [showPassword, setShowPassword] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="bg-dark-300 border-2 border-gold-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gold-500 text-lg">{credential.game_name}</h3>
          <p className="text-sm text-gray-400">{credential.client_name}</p>
        </div>
        <Badge variant="success">Active</Badge>
      </div>

      <div className="space-y-3">
        {/* Username */}
        <div className="bg-dark-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 font-medium flex items-center gap-1">
              <FaUser className="text-gold-500" />
              Username
            </label>
            <button
              onClick={() => copyToClipboard(credential.username, 'Username')}
              className="text-gold-500 hover:text-gold-400 transition-colors"
            >
              <MdContentCopy />
            </button>
          </div>
          <p className="text-white font-mono">{credential.username}</p>
        </div>

        {/* Password */}
        <div className="bg-dark-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 font-medium flex items-center gap-1">
              <FaKey className="text-gold-500" />
              Password
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="text-gold-500 hover:text-gold-400 transition-colors"
              >
                {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
              </button>
              <button
                onClick={() => copyToClipboard(credential.password, 'Password')}
                className="text-gold-500 hover:text-gold-400 transition-colors"
              >
                <MdContentCopy />
              </button>
            </div>
          </div>
          <p className="text-white font-mono">
            {showPassword ? credential.password : '••••••••••'}
          </p>
        </div>

        {/* Login URL */}
        {credential.login_url && (
          <div className="bg-dark-200 rounded-lg p-3">
            <label className="text-xs text-gray-400 font-medium mb-2 block">
              Login URL
            </label>
            <div className="flex items-center gap-2">
              <p className="text-blue-400 text-sm flex-1 truncate">{credential.login_url}</p>
              <button
                onClick={() => copyToClipboard(credential.login_url!, 'URL')}
                className="text-gold-500 hover:text-gold-400 transition-colors"
              >
                <MdContentCopy />
              </button>
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button
            onClick={() => {
              if (credential.login_url) {
                window.open(credential.login_url, '_blank');
              } else {
                toast.error('No login URL available');
              }
            }}
            variant="primary"
            fullWidth
          >
            Open Game
          </Button>
        </div>
      </div>
    </div>
  );
}
