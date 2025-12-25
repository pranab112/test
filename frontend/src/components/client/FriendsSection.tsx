import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import toast from 'react-hot-toast';
import { MdPersonAdd, MdMessage, MdPersonRemove, MdCheck, MdClose } from 'react-icons/md';

interface Friend {
  id: number;
  username: string;
  avatar?: string;
  online: boolean;
  lastSeen?: string;
  mutualFriends?: number;
}

interface FriendRequest {
  id: number;
  username: string;
  avatar?: string;
  mutualFriends: number;
  sentAt: string;
}

export function FriendsSection() {
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // TODO: Replace with API call
  const mockFriendRequests: FriendRequest[] = [
    {
      id: 1,
      username: 'player_alex',
      avatar: undefined,
      mutualFriends: 3,
      sentAt: '2 hours ago',
    },
    {
      id: 2,
      username: 'gamer_mike',
      avatar: undefined,
      mutualFriends: 5,
      sentAt: '1 day ago',
    },
  ];

  // TODO: Replace with API call
  const mockFriends: Friend[] = [
    {
      id: 1,
      username: 'player_john',
      avatar: undefined,
      online: true,
      mutualFriends: 7,
    },
    {
      id: 2,
      username: 'gamer_sarah',
      avatar: undefined,
      online: false,
      lastSeen: '2 hours ago',
      mutualFriends: 4,
    },
    {
      id: 3,
      username: 'pro_player_99',
      avatar: undefined,
      online: true,
      mutualFriends: 12,
    },
    {
      id: 4,
      username: 'casual_gamer',
      avatar: undefined,
      online: false,
      lastSeen: '1 day ago',
      mutualFriends: 2,
    },
  ];

  const [friendRequests, setFriendRequests] = useState(mockFriendRequests);
  const [friends, setFriends] = useState(mockFriends);

  const handleAddFriend = async () => {
    if (!searchUsername.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await clientApi.sendFriendRequest(searchUsername);
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success(`Friend request sent to ${searchUsername}`);
      setSearchUsername('');
      setShowAddFriendModal(false);
    } catch (error) {
      toast.error('Failed to send friend request');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: number, username: string) => {
    try {
      // TODO: Replace with actual API call
      // await clientApi.acceptFriendRequest(requestId);
      await new Promise(resolve => setTimeout(resolve, 300));
      toast.success(`You are now friends with ${username}`);
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      toast.error('Failed to accept friend request');
      console.error(error);
    }
  };

  const handleDeclineRequest = async (requestId: number, username: string) => {
    try {
      // TODO: Replace with actual API call
      // await clientApi.declineFriendRequest(requestId);
      await new Promise(resolve => setTimeout(resolve, 300));
      toast.success(`Declined friend request from ${username}`);
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      toast.error('Failed to decline friend request');
      console.error(error);
    }
  };

  const handleRemoveFriend = async (friendId: number, username: string) => {
    if (!confirm(`Remove ${username} from your friends?`)) {
      return;
    }

    try {
      // TODO: Replace with actual API call
      // await clientApi.removeFriend(friendId);
      await new Promise(resolve => setTimeout(resolve, 300));
      toast.success(`Removed ${username} from friends`);
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (error) {
      toast.error('Failed to remove friend');
      console.error(error);
    }
  };

  const handleMessageFriend = (_friendId: number, username: string) => {
    // TODO: Navigate to messages section with this friend selected
    toast.success(`Opening chat with ${username}...`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500 mb-2">Friends</h1>
          <p className="text-gray-400">Manage your gaming network</p>
        </div>
        <button
          onClick={() => setShowAddFriendModal(true)}
          className="bg-gold-600 hover:bg-gold-700 text-dark-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <MdPersonAdd size={20} />
          Add Friend
        </button>
      </div>

      {/* Friend Requests Panel */}
      {friendRequests.length > 0 && (
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">
            Friend Requests ({friendRequests.length})
          </h2>
          <div className="space-y-3">
            {friendRequests.map((request) => (
              <div
                key={request.id}
                className="bg-dark-300 p-4 rounded-lg flex items-center justify-between hover:bg-dark-400 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar name={request.username} size="lg" />
                  <div>
                    <p className="text-white font-medium">{request.username}</p>
                    <p className="text-sm text-gray-400">
                      {request.mutualFriends} mutual friends • {request.sentAt}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(request.id, request.username)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                  >
                    <MdCheck size={18} />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(request.id, request.username)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                  >
                    <MdClose size={18} />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Friends List */}
      <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gold-500 mb-4">
          My Friends ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <div className="text-center py-12">
            <MdPersonAdd className="text-6xl text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No friends yet. Start connecting!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="bg-dark-300 p-4 rounded-lg hover:bg-dark-400 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  <Avatar name={friend.username} size="lg" online={friend.online} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{friend.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {friend.online ? (
                        <Badge variant="success" size="sm" dot>
                          Online
                        </Badge>
                      ) : (
                        <p className="text-xs text-gray-400">
                          Last seen {friend.lastSeen}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {friend.mutualFriends} mutual friends
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMessageFriend(friend.id, friend.username)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <MdMessage size={16} />
                    Message
                  </button>
                  <button
                    onClick={() => handleRemoveFriend(friend.id, friend.username)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <MdPersonRemove size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      <Modal
        isOpen={showAddFriendModal}
        onClose={() => {
          setShowAddFriendModal(false);
          setSearchUsername('');
        }}
        title="Add Friend"
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            Enter the username of the person you want to add as a friend.
          </p>
          <Input
            label="Username"
            type="text"
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            placeholder="Enter username..."
            className="w-full"
          />
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddFriendModal(false);
                setSearchUsername('');
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button onClick={handleAddFriend} loading={loading} fullWidth>
              Send Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
