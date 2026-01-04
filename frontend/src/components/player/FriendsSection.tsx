import { useState, useEffect } from 'react';
import { Badge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import toast from 'react-hot-toast';
import { MdSearch, MdPersonAdd, MdMessage, MdPersonRemove, MdCheck, MdClose, MdRefresh, MdFlag, MdSend, MdInbox } from 'react-icons/md';
import { friendsApi, type FriendDetails, type FriendRequest } from '@/api/endpoints';
import { reportsApi } from '@/api/endpoints/reports.api';
import { formatDistanceToNow } from 'date-fns';
import { useDashboard } from '@/contexts/DashboardContext';

type FriendsTab = 'friends' | 'received' | 'sent';

export function FriendsSection() {
  const { openChatWith } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FriendsTab>('friends');
  const [friends, setFriends] = useState<FriendDetails[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendDetails[]>([]);
  const [searching, setSearching] = useState(false);
  const [processingRequests, setProcessingRequests] = useState<Set<number>>(new Set());
  const [sendingRequests, setSendingRequests] = useState<Set<number>>(new Set());

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<FriendDetails | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [friendsData, receivedData, sentData] = await Promise.all([
        friendsApi.getFriends(),
        friendsApi.getPendingRequests(),
        friendsApi.getSentRequests(),
      ]);
      setFriends(friendsData);
      setReceivedRequests(receivedData);
      // Filter to only show pending sent requests
      setSentRequests(sentData.filter(r => r.status === 'pending'));
    } catch (error) {
      console.error('Failed to load friends data:', error);
      toast.error('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a username to search');
      return;
    }

    setSearching(true);
    try {
      const results = await friendsApi.searchUsers(searchQuery);
      // Filter out existing friends and pending requests
      const friendIds = new Set(friends.map(f => f.id));
      const sentIds = new Set(sentRequests.map(r => r.receiver?.id).filter(Boolean));
      const receivedIds = new Set(receivedRequests.map(r => r.requester?.id).filter(Boolean));

      const filtered = results.filter(u =>
        !friendIds.has(u.id) &&
        !sentIds.has(u.id) &&
        !receivedIds.has(u.id)
      );
      setSearchResults(filtered);

      if (filtered.length === 0) {
        toast('No users found or request already sent', { icon: '🔍' });
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: number, username: string) => {
    setSendingRequests(prev => new Set(prev).add(userId));
    try {
      await friendsApi.sendFriendRequestById(userId);
      toast.success(`Friend request sent to ${username}`);
      setSearchResults(prev => prev.filter(u => u.id !== userId));
      await loadData();
    } catch (error: any) {
      toast.error(error.detail || error.message || 'Failed to send friend request');
    } finally {
      setSendingRequests(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleAcceptRequest = async (requestId: number, username: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    try {
      await friendsApi.acceptRequest(requestId);
      toast.success(`You are now friends with ${username}`);
      await loadData();
    } catch (error: any) {
      toast.error(error.detail || 'Failed to accept friend request');
    } finally {
      setProcessingRequests(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleRejectRequest = async (requestId: number, username: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    try {
      await friendsApi.rejectRequest(requestId);
      toast.success(`Declined friend request from ${username}`);
      setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error: any) {
      toast.error(error.detail || 'Failed to decline friend request');
    } finally {
      setProcessingRequests(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleRemoveFriend = async (friendId: number, username: string) => {
    if (!confirm(`Remove ${username} from your friends?`)) return;

    try {
      await friendsApi.removeFriend(friendId);
      toast.success(`Removed ${username} from friends`);
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (error: any) {
      toast.error(error.detail || 'Failed to remove friend');
    }
  };

  const handleMessageFriend = (friend: FriendDetails) => {
    openChatWith({
      id: friend.id,
      username: friend.username,
      full_name: friend.full_name,
      profile_picture: friend.profile_picture,
      is_online: friend.is_online,
    });
  };

  const openReportModal = async (friend: FriendDetails) => {
    // Check if user can report this friend
    try {
      const reportInfo = await reportsApi.getUserReports(friend.id);
      if (!reportInfo.can_report) {
        toast.error('You have already reported this user');
        return;
      }
      setReportTarget(friend);
      setReportReason('');
      setShowReportModal(true);
    } catch (error: any) {
      toast.error(error.detail || 'Failed to check report status');
    }
  };

  const handleSubmitReport = async () => {
    if (!reportTarget) return;
    if (!reportReason.trim()) {
      toast.error('Please enter a reason for the report');
      return;
    }

    setSubmittingReport(true);
    try {
      await reportsApi.createReport({
        reported_user_id: reportTarget.id,
        reason: reportReason.trim(),
      });
      toast.success(`Report submitted for ${reportTarget.username}`);
      setShowReportModal(false);
      setReportTarget(null);
      setReportReason('');
    } catch (error: any) {
      toast.error(error.detail || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-500">Loading friends...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold-500">Friends</h1>
          <p className="text-gray-400">Connect with clients</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadData}
            className="bg-dark-300 hover:bg-dark-400 text-gold-500 p-3 rounded-lg transition-colors"
            title="Refresh"
          >
            <MdRefresh size={20} />
          </button>
          <Button onClick={() => setShowAddModal(true)}>
            <MdPersonAdd size={18} className="mr-2" />
            Add Friend
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-dark-400 overflow-x-auto">
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'friends'
              ? 'text-gold-500 border-gold-500'
              : 'text-gray-400 border-transparent hover:text-gold-500'
          }`}
        >
          <MdPersonAdd size={18} />
          My Friends
          <Badge variant="default" size="sm">{friends.length}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'received'
              ? 'text-gold-500 border-gold-500'
              : 'text-gray-400 border-transparent hover:text-gold-500'
          }`}
        >
          <MdInbox size={18} />
          Received
          {receivedRequests.length > 0 && (
            <Badge variant="warning" size="sm">{receivedRequests.length}</Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'sent'
              ? 'text-gold-500 border-gold-500'
              : 'text-gray-400 border-transparent hover:text-gold-500'
          }`}
        >
          <MdSend size={18} />
          Sent
          {sentRequests.length > 0 && (
            <Badge variant="info" size="sm">{sentRequests.length}</Badge>
          )}
        </button>
      </div>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">
            My Friends ({friends.length})
          </h2>

          {friends.length === 0 ? (
            <div className="text-center py-12">
              <MdPersonAdd className="text-6xl text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">You haven't added any friends yet</p>
              <Button onClick={() => setShowAddModal(true)}>
                <MdSearch size={18} className="mr-2" />
                Find Friends
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="bg-dark-300 p-4 rounded-lg hover:bg-dark-400 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar
                      name={friend.full_name || friend.username}
                      size="lg"
                      online={friend.is_online}
                      src={friend.profile_picture}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{friend.username}</p>
                      <p className="text-sm text-gray-400 truncate">{friend.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {friend.is_online ? (
                          <Badge variant="success" size="sm" dot>
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">
                            Offline
                          </Badge>
                        )}
                        <Badge variant="purple" size="sm">{friend.user_type}</Badge>
                      </div>
                    </div>
                  </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleMessageFriend(friend)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <MdMessage size={16} />
                    Message
                  </button>
                  <button
                    type="button"
                    onClick={() => openReportModal(friend)}
                    className="bg-yellow-600/20 hover:bg-yellow-600 text-yellow-500 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    title="Report user"
                  >
                    <MdFlag size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFriend(friend.id, friend.username)}
                    className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    title="Remove friend"
                  >
                    <MdPersonRemove size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Received Requests Tab */}
      {activeTab === 'received' && (
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">
            Received Friend Requests ({receivedRequests.length})
          </h2>

          {receivedRequests.length === 0 ? (
            <div className="text-center py-12">
              <MdInbox className="text-6xl text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No pending friend requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {receivedRequests.map((request) => {
                const requester = request.requester;
                const isProcessing = processingRequests.has(request.id);
                return (
                  <div
                    key={request.id}
                    className="bg-dark-300 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={requester?.full_name || requester?.username || 'Unknown'}
                        size="md"
                        src={requester?.profile_picture}
                      />
                      <div>
                        <p className="text-white font-medium">{requester?.username || 'Unknown User'}</p>
                        <p className="text-sm text-gray-400">
                          {requester?.full_name} • {formatTime(request.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(request.id, requester?.username || 'User')}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <MdCheck size={18} />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(request.id, requester?.username || 'User')}
                        disabled={isProcessing}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <MdClose size={18} />
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sent Requests Tab */}
      {activeTab === 'sent' && (
        <div className="bg-dark-200 border-2 border-gold-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gold-500 mb-4">
            Sent Friend Requests ({sentRequests.length})
          </h2>

          {sentRequests.length === 0 ? (
            <div className="text-center py-12">
              <MdSend className="text-6xl text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No pending sent requests</p>
              <Button onClick={() => setShowAddModal(true)}>
                <MdSearch size={18} className="mr-2" />
                Find Friends
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sentRequests.map((request) => {
                const receiver = request.receiver;
                return (
                  <div
                    key={request.id}
                    className="bg-dark-300 p-4 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={receiver?.full_name || receiver?.username || 'Unknown'}
                        size="md"
                        src={receiver?.profile_picture}
                      />
                      <div>
                        <p className="text-white font-medium">{receiver?.username || 'Unknown User'}</p>
                        <p className="text-sm text-gray-400">
                          {receiver?.full_name} • Sent {formatTime(request.created_at)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Friend Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSearchQuery('');
          setSearchResults([]);
        }}
        title="Find Clients"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            Search for clients by username to send them a friend request.
          </p>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label="Search by Username"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter username..."
              />
            </div>
            <Button onClick={handleSearch} loading={searching} className="mt-6">
              <MdSearch size={20} />
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-400">Search Results</h3>
              {searchResults.map((user) => {
                const isSending = sendingRequests.has(user.id);
                return (
                  <div
                    key={user.id}
                    className="bg-dark-300 p-3 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={user.full_name || user.username}
                        size="md"
                        src={user.profile_picture}
                        online={user.is_online}
                      />
                      <div>
                        <p className="text-white font-medium">{user.username}</p>
                        <p className="text-sm text-gray-400">
                          {user.full_name}
                          <Badge variant="purple" size="sm" className="ml-2">{user.user_type}</Badge>
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleSendRequest(user.id, user.username)}
                      loading={isSending}
                      disabled={isSending}
                    >
                      <MdPersonAdd size={16} className="mr-1" />
                      Add
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-dark-400">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              fullWidth
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Report User Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setReportTarget(null);
          setReportReason('');
        }}
        title="Report User"
        size="md"
      >
        {reportTarget && (
          <div className="space-y-4">
            <div className="bg-dark-300 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar
                  name={reportTarget.full_name || reportTarget.username}
                  size="md"
                  src={reportTarget.profile_picture}
                />
                <div>
                  <p className="text-white font-medium">{reportTarget.username}</p>
                  <p className="text-sm text-gray-400">{reportTarget.full_name}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for Report *
              </label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe why you are reporting this user..."
                rows={4}
                className="w-full bg-dark-400 text-white px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowReportModal(false);
                  setReportTarget(null);
                  setReportReason('');
                }}
                fullWidth
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReport}
                loading={submittingReport}
                fullWidth
                className="bg-red-600 hover:bg-red-700"
              >
                <MdFlag size={16} className="mr-1" />
                Submit Report
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
