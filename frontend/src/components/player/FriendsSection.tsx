import { useState } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { MdSearch, MdPersonAdd } from 'react-icons/md';

interface Friend {
  id: number;
  username: string;
  full_name: string;
  level: number;
  is_online: boolean;
}

interface FriendRequest {
  id: number;
  username: string;
  full_name: string;
  level: number;
  created_at: string;
}

interface UserSearchResult {
  id: number;
  username: string;
  full_name: string;
  level: number;
  is_friend: boolean;
  request_pending: boolean;
}

// TODO: Replace with API data
const MOCK_FRIENDS: Friend[] = [
  { id: 1, username: 'player_john', full_name: 'John Doe', level: 18, is_online: true },
  { id: 2, username: 'player_sarah', full_name: 'Sarah Smith', level: 12, is_online: false },
  { id: 3, username: 'player_alex', full_name: 'Alex Johnson', level: 25, is_online: true },
  { id: 4, username: 'player_emma', full_name: 'Emma Wilson', level: 15, is_online: false },
];

const MOCK_REQUESTS: FriendRequest[] = [
  { id: 1, username: 'player_mike', full_name: 'Mike Wilson', level: 20, created_at: '2 hours ago' },
  { id: 2, username: 'player_lisa', full_name: 'Lisa Brown', level: 16, created_at: '1 day ago' },
];

const MOCK_SEARCH_RESULTS: UserSearchResult[] = [
  { id: 5, username: 'player_david', full_name: 'David Lee', level: 22, is_friend: false, request_pending: false },
  { id: 6, username: 'player_sophia', full_name: 'Sophia Martinez', level: 19, is_friend: false, request_pending: true },
];

export function FriendsSection() {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a username to search');
      return;
    }

    setSearching(true);
    // TODO: Replace with actual API call
    setTimeout(() => {
      setSearchResults(MOCK_SEARCH_RESULTS);
      setSearching(false);
      toast.success(`Found ${MOCK_SEARCH_RESULTS.length} users`);
    }, 500);
  };

  const handleAcceptRequest = (request: FriendRequest) => {
    // TODO: API call to accept friend request
    toast.success(`Accepted friend request from ${request.username}`);
  };

  const handleDeclineRequest = (request: FriendRequest) => {
    // TODO: API call to decline friend request
    toast.error(`Declined friend request from ${request.username}`);
  };

  const handleSendRequest = (user: UserSearchResult) => {
    // TODO: API call to send friend request
    toast.success(`Friend request sent to ${user.username}`);
  };

  const handleRemoveFriend = (friend: Friend) => {
    // TODO: API call to remove friend
    toast.error(`Removed ${friend.username} from friends`);
  };

  const friendColumns = [
    {
      key: 'username',
      label: 'Player',
      render: (friend: Friend) => (
        <div className="flex items-center gap-3">
          <Avatar name={friend.full_name} size="sm" online={friend.is_online} />
          <div>
            <div className="font-medium text-white">{friend.username}</div>
            <div className="text-xs text-gray-400">{friend.full_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'level',
      label: 'Level',
      render: (friend: Friend) => (
        <Badge variant="info">Level {friend.level}</Badge>
      ),
    },
    {
      key: 'is_online',
      label: 'Status',
      render: (friend: Friend) => (
        <Badge variant={friend.is_online ? 'success' : 'default'} dot>
          {friend.is_online ? 'Online' : 'Offline'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (friend: Friend) => (
        <div className="flex gap-2">
          <button
            onClick={() => toast.success(`Messaging ${friend.username}`)}
            className="text-gold-500 hover:text-gold-400 text-sm font-medium"
          >
            Send Message
          </button>
          <button
            onClick={() => handleRemoveFriend(friend)}
            className="text-red-500 hover:text-red-400 text-sm font-medium"
          >
            Remove
          </button>
        </div>
      ),
    },
  ];

  const requestColumns = [
    {
      key: 'username',
      label: 'Player',
      render: (request: FriendRequest) => (
        <div className="flex items-center gap-3">
          <Avatar name={request.full_name} size="sm" />
          <div>
            <div className="font-medium text-white">{request.username}</div>
            <div className="text-xs text-gray-400">{request.full_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'level',
      label: 'Level',
      render: (request: FriendRequest) => (
        <Badge variant="info">Level {request.level}</Badge>
      ),
    },
    { key: 'created_at', label: 'Received' },
    {
      key: 'actions',
      label: 'Actions',
      render: (request: FriendRequest) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleAcceptRequest(request)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => handleDeclineRequest(request)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Decline
          </button>
        </div>
      ),
    },
  ];

  const searchColumns = [
    {
      key: 'username',
      label: 'Player',
      render: (user: UserSearchResult) => (
        <div className="flex items-center gap-3">
          <Avatar name={user.full_name} size="sm" />
          <div>
            <div className="font-medium text-white">{user.username}</div>
            <div className="text-xs text-gray-400">{user.full_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'level',
      label: 'Level',
      render: (user: UserSearchResult) => (
        <Badge variant="info">Level {user.level}</Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (user: UserSearchResult) => {
        if (user.is_friend) {
          return <Badge variant="success">Friend</Badge>;
        } else if (user.request_pending) {
          return <Badge variant="warning">Request Sent</Badge>;
        }
        return <Badge variant="default">Not Connected</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user: UserSearchResult) => {
        if (user.is_friend) {
          return (
            <button
              onClick={() => toast.success(`Messaging ${user.username}`)}
              className="text-gold-500 hover:text-gold-400 text-sm font-medium"
            >
              Send Message
            </button>
          );
        } else if (user.request_pending) {
          return (
            <span className="text-gray-500 text-sm">Request Pending</span>
          );
        }
        return (
          <button
            onClick={() => handleSendRequest(user)}
            className="flex items-center gap-1 text-blue-500 hover:text-blue-400 text-sm font-medium"
          >
            <MdPersonAdd />
            Add Friend
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500">Friends</h1>
          <p className="text-gray-400 mt-1">
            {activeTab === 'friends' && `You have ${MOCK_FRIENDS.length} friends`}
            {activeTab === 'requests' && `${MOCK_REQUESTS.length} pending requests`}
            {activeTab === 'search' && 'Search for players to add as friends'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'friends'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Friends ({MOCK_FRIENDS.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg font-medium transition-all relative ${
              activeTab === 'requests'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Requests
            {MOCK_REQUESTS.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {MOCK_REQUESTS.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'search'
                ? 'bg-gold-gradient text-dark-700'
                : 'bg-dark-300 text-gray-400 hover:text-gold-500'
            }`}
          >
            Search
          </button>
        </div>
      </div>

      {activeTab === 'search' && (
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">Search Players</h2>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter username to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button
              onClick={handleSearch}
              loading={searching}
              variant="primary"
            >
              <MdSearch className="text-xl" />
              Search
            </Button>
          </div>
        </div>
      )}

      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        {activeTab === 'friends' && (
          <>
            <h2 className="text-xl font-bold text-gold-500 mb-4">Your Friends</h2>
            <DataTable
              data={MOCK_FRIENDS}
              columns={friendColumns}
              emptyMessage="No friends yet. Use the search tab to find players!"
            />
          </>
        )}

        {activeTab === 'requests' && (
          <>
            <h2 className="text-xl font-bold text-gold-500 mb-4">Friend Requests</h2>
            <DataTable
              data={MOCK_REQUESTS}
              columns={requestColumns}
              emptyMessage="No pending friend requests"
            />
          </>
        )}

        {activeTab === 'search' && searchResults.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-gold-500 mb-4">Search Results</h2>
            <DataTable
              data={searchResults}
              columns={searchColumns}
              emptyMessage="No users found"
            />
          </>
        )}

        {activeTab === 'search' && searchResults.length === 0 && !searching && (
          <div className="text-center py-12">
            <MdSearch className="text-6xl text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Enter a username above to search for players</p>
          </div>
        )}
      </div>
    </div>
  );
}
