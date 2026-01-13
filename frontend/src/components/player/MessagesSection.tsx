import { useState, useEffect, useRef } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import toast from 'react-hot-toast';
import { MdMessage, MdSend, MdContentCopy, MdVisibility, MdVisibilityOff, MdRefresh, MdImage, MdMic, MdClose, MdSettings, MdStar, MdMoreVert, MdPersonOff, MdDeleteForever } from 'react-icons/md';
import { FaKey } from 'react-icons/fa';
import { useDashboard } from '@/contexts/DashboardContext';
import { chatApi, type Conversation, type Message } from '@/api/endpoints/chat.api';
import { gameCredentialsApi, type GameCredential } from '@/api/endpoints/gameCredentials.api';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { getFileUrl } from '@/config/api.config';
import { useCallback } from 'react';

export function MessagesSection() {
  const { chatTarget, clearChatTarget } = useDashboard();
  const { user } = useAuth();
  const { getRoomId, messages: wsMessages, joinRoom, leaveRoom, onlineUsers, requestOnlineStatus, isConnected } = useWebSocket();

  // Helper to check if a friend is online (prefer real-time status over initial data)
  const isFriendOnline = useCallback((friendId: number, initialOnlineStatus?: boolean) => {
    const wsStatus = onlineUsers.get(friendId);
    if (wsStatus !== undefined) {
      return wsStatus.is_online;
    }
    return initialOnlineStatus ?? false;
  }, [onlineUsers]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentRoomRef = useRef<string | null>(null);

  // Credentials modal state (per client)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedClientCredentials, setSelectedClientCredentials] = useState<GameCredential[]>([]);
  const [loadingClientCredentials, setLoadingClientCredentials] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState<string>('');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Image attachment state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete menu state
  const [deleteMenuOpen, setDeleteMenuOpen] = useState<number | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Request online status for all conversation partners when conversations load or WebSocket connects
  useEffect(() => {
    if (isConnected && conversations.length > 0) {
      const friendIds = conversations.map(c => c.friend.id);
      requestOnlineStatus(friendIds);
    }
  }, [isConnected, conversations, requestOnlineStatus]);

  const openClientCredentials = async (clientId: number, clientName: string) => {
    setShowCredentialsModal(true);
    setSelectedClientName(clientName);
    setLoadingClientCredentials(true);
    try {
      // Get all credentials and filter by client ID
      const allCredentials = await gameCredentialsApi.getMyCredentials();
      const clientCredentials = allCredentials.filter(cred => cred.created_by_client_id === clientId);
      setSelectedClientCredentials(clientCredentials);
    } catch (error) {
      console.error('Failed to load client credentials:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoadingClientCredentials(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close delete menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (deleteMenuOpen !== null) {
        setDeleteMenuOpen(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [deleteMenuOpen]);

  // Listen for new WebSocket messages
  useEffect(() => {
    if (selectedConversation && user) {
      const roomId = getRoomId(selectedConversation.friend.id);
      const wsRoomMessages = wsMessages.get(roomId);

      if (wsRoomMessages && wsRoomMessages.length > 0) {
        // Convert WebSocket messages to Message format and merge with existing
        const newMessages = wsRoomMessages.map(wsMsg => ({
          id: wsMsg.id as number,
          sender_id: wsMsg.sender_id,
          receiver_id: wsMsg.receiver_id,
          message_type: wsMsg.message_type as 'text' | 'image' | 'voice' | 'promotion',
          content: wsMsg.content,
          file_url: wsMsg.file_url,
          file_name: wsMsg.file_name,
          duration: wsMsg.duration,
          is_read: wsMsg.is_read,
          created_at: wsMsg.created_at,
        }));

        setMessages(prev => {
          // Merge and dedupe by id
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
          if (uniqueNew.length > 0) {
            return [...prev, ...uniqueNew];
          }
          return prev;
        });
      }
    }
  }, [wsMessages, selectedConversation, user, getRoomId]);

  // Join/leave room when conversation changes
  useEffect(() => {
    if (selectedConversation && user) {
      const roomId = getRoomId(selectedConversation.friend.id);

      // Leave previous room
      if (currentRoomRef.current && currentRoomRef.current !== roomId) {
        leaveRoom(currentRoomRef.current);
      }

      // Join new room
      joinRoom(roomId);
      currentRoomRef.current = roomId;
    }

    return () => {
      if (currentRoomRef.current) {
        leaveRoom(currentRoomRef.current);
        currentRoomRef.current = null;
      }
    };
  }, [selectedConversation, user, getRoomId, joinRoom, leaveRoom]);

  // When a chat target is passed from friends section, open that conversation
  useEffect(() => {
    if (chatTarget) {
      // Check if conversation already exists in the list
      const existingConv = conversations.find(c => c.friend.id === chatTarget.id);

      if (existingConv) {
        handleSelectConversation(existingConv);
      } else {
        // Create a new conversation entry for this friend
        const newConversation: Conversation = {
          friend: {
            id: chatTarget.id,
            username: chatTarget.username,
            full_name: chatTarget.full_name,
            profile_picture: chatTarget.profile_picture,
            is_online: chatTarget.is_online,
          },
          unread_count: 0,
        };
        setConversations(prev => [newConversation, ...prev]);
        handleSelectConversation(newConversation);
      }

      clearChatTarget();
    }
  }, [chatTarget, conversations, clearChatTarget]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const data = await chatApi.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    try {
      const data = await chatApi.getMessages(conversation.friend.id);
      setMessages(data.messages);

      // Update unread count in conversations list
      setConversations(prev =>
        prev.map(c =>
          c.friend.id === conversation.friend.id
            ? { ...c, unread_count: 0 }
            : c
        )
      );
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const sentMessage = await chatApi.sendTextMessage(
        selectedConversation.friend.id,
        newMessage.trim()
      );

      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');

      // Update conversation's last message
      setConversations(prev =>
        prev.map(c =>
          c.friend.id === selectedConversation.friend.id
            ? { ...c, last_message: sentMessage }
            : c
        )
      );
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error(error.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: number, deleteForEveryone: boolean = false) => {
    try {
      if (deleteForEveryone) {
        // Delete for everyone - removes the message from the database
        await chatApi.deleteMessage(messageId);
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast.success('Message deleted for everyone');
      } else {
        // Delete for myself - just hide locally (message still exists for other user)
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast.success('Message hidden');
      }
      setDeleteMenuOpen(null);
    } catch (error: any) {
      console.error('Delete message error:', error);
      const message = error?.detail || error?.error?.message || 'Failed to delete message';
      toast.error(message);
    }
  };

  // Image handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Image size must be less than 10MB');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImagePreview = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendImage = async () => {
    if (!selectedImage || !selectedConversation) return;

    setSending(true);
    try {
      const sentMessage = await chatApi.sendImageMessage(
        selectedConversation.friend.id,
        selectedImage
      );
      setMessages(prev => [...prev, sentMessage]);
      clearImagePreview();
      toast.success('Image sent!');
    } catch (error: any) {
      console.error('Failed to send image:', error);
      toast.error(error.detail || 'Failed to send image');
    } finally {
      setSending(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      // Request data every 250ms to ensure we capture audio chunks
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          resolve(audioBlob);
        };

        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        setIsRecording(false);
      } else {
        resolve(null);
      }
    });
  };

  const cancelRecording = async () => {
    await stopRecording();
    audioChunksRef.current = [];
    setRecordingDuration(0);
  };

  const sendVoiceMessage = async () => {
    if (!selectedConversation || !mediaRecorderRef.current) return;

    const duration = recordingDuration;
    setSending(true);

    try {
      // Stop recording and wait for the blob
      const audioBlob = await stopRecording();

      if (!audioBlob || audioBlob.size === 0) {
        toast.error('No audio recorded');
        setSending(false);
        return;
      }

      const audioFile = new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' });

      const sentMessage = await chatApi.sendVoiceMessage(
        selectedConversation.friend.id,
        audioFile,
        duration
      );

      setMessages(prev => [...prev, sentMessage]);
      audioChunksRef.current = [];
      setRecordingDuration(0);
      toast.success('Voice message sent!');
    } catch (error: any) {
      console.error('Failed to send voice message:', error);
      toast.error(error.detail || 'Failed to send voice message');
    } finally {
      setSending(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      if (isToday) {
        return timeStr;
      } else if (isYesterday) {
        return `Yesterday ${timeStr}`;
      } else {
        return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${timeStr}`;
      }
    } catch {
      return dateString;
    }
  };

  // Helper to parse and detect promotion messages
  const parsePromotionMessage = (message: Message): { isPromotion: boolean; data?: any } => {
    if (message.message_type !== 'promotion' || !message.content) {
      return { isPromotion: false };
    }

    try {
      const data = JSON.parse(message.content);
      return { isPromotion: true, data };
    } catch (e) {
      console.error('Failed to parse promotion message:', e);
      return { isPromotion: false };
    }
  };

  const getMessagePreview = (message?: Message): React.ReactNode => {
    if (!message) return 'No messages yet';
    switch (message.message_type) {
      case 'text':
        return message.content || '';
      case 'image':
        return <span className="flex items-center gap-1"><MdImage size={14} /> Image</span>;
      case 'voice':
        return <span className="flex items-center gap-1"><MdMic size={14} /> Voice message</span>;
      case 'promotion':
        return '🎁 Promotion';
      default:
        return message.content || '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-emerald-500 mb-2">Messages</h1>
          <p className="text-gray-400">Chat with clients and friends</p>
        </div>
        <button
          type="button"
          onClick={loadConversations}
          className="bg-dark-300 hover:bg-dark-400 text-emerald-500 p-3 rounded-lg transition-colors"
          title="Refresh"
        >
          <MdRefresh size={20} />
        </button>
      </div>

      {/* Messages Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-320px)] min-h-[500px]">
        {/* Conversations List */}
        <div className="lg:col-span-1 h-full min-h-0">
          <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg overflow-hidden h-full flex flex-col">
            <div className="p-4 bg-gradient-to-r from-dark-300 to-dark-200 border-b border-emerald-700 flex-shrink-0">
              <h2 className="text-lg font-bold text-emerald-500">Conversations</h2>
            </div>
            <div className="divide-y divide-dark-400 flex-1 overflow-y-auto min-h-0">
              {loadingConversations ? (
                <div className="p-4 text-center text-gray-400">
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MdMessage className="text-4xl text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">No conversations yet</p>
                  <p className="text-sm text-gray-500">Add friends to start chatting</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    type="button"
                    key={conv.friend.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-4 text-left transition-colors ${
                      selectedConversation?.friend.id === conv.friend.id
                        ? 'bg-dark-400'
                        : 'hover:bg-dark-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        name={conv.friend.full_name || conv.friend.username}
                        size="sm"
                        online={isFriendOnline(conv.friend.id, conv.friend.is_online)}
                        src={conv.friend.profile_picture}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-white truncate">{conv.friend.username}</p>
                          {conv.unread_count > 0 && (
                            <Badge variant="error" size="sm">{conv.unread_count}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {getMessagePreview(conv.last_message)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(conv.last_message?.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 h-full min-h-0">
          <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg overflow-hidden h-full flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 bg-gradient-to-r from-dark-300 to-dark-200 border-b border-emerald-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={selectedConversation.friend.full_name || selectedConversation.friend.username}
                        size="sm"
                        online={isFriendOnline(selectedConversation.friend.id, selectedConversation.friend.is_online)}
                        src={selectedConversation.friend.profile_picture}
                      />
                      <div>
                        <p className="font-bold text-white">{selectedConversation.friend.username}</p>
                        <p className="text-xs text-gray-400">
                          {selectedConversation.friend.full_name}
                          {isFriendOnline(selectedConversation.friend.id, selectedConversation.friend.is_online) ? (
                            <span className="text-green-500 ml-2">● Online</span>
                          ) : (
                            <span className="text-gray-500 ml-2">● Offline</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {/* Credentials/Settings button */}
                    <button
                      type="button"
                      onClick={() => openClientCredentials(selectedConversation.friend.id, selectedConversation.friend.username)}
                      className="bg-dark-400 hover:bg-dark-300 text-emerald-500 p-2 rounded-lg transition-colors"
                      title="View Game Credentials"
                    >
                      <MdSettings size={20} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MdMessage className="text-4xl text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400">No messages yet</p>
                        <p className="text-sm text-gray-500">Send a message to start the conversation</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg) => {
                        const isOwn = msg.sender_id === user?.id;
                        const promotionInfo = parsePromotionMessage(msg);

                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                              <div className={`rounded-lg p-3 ${
                                promotionInfo.isPromotion
                                  ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
                                  : isOwn
                                  ? 'bg-emerald-gradient text-dark-700'
                                  : 'bg-dark-300 text-white'
                              }`}>
                                {promotionInfo.isPromotion && promotionInfo.data ? (
                                  // Promotion Message
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 border-b border-white/20 pb-2">
                                      <MdStar className="text-yellow-300" size={18} />
                                      <span className="font-bold text-sm">
                                        {promotionInfo.data.type === 'promotion_claim_request'
                                          ? 'Promotion Claim Request'
                                          : promotionInfo.data.type === 'promotion_claim_approved'
                                          ? 'Promotion Approved ✅'
                                          : promotionInfo.data.type === 'promotion_claim_rejected'
                                          ? 'Promotion Rejected ❌'
                                          : 'Promotion Update'
                                        }
                                      </span>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                      {promotionInfo.data.promotion_title && (
                                        <div>
                                          <span className="text-white/70">Promotion:</span>
                                          <div className="font-semibold">{promotionInfo.data.promotion_title}</div>
                                        </div>
                                      )}
                                      {promotionInfo.data.value && (
                                        <div>
                                          <span className="text-white/70">Value:</span>
                                          <span className="font-semibold ml-1">{promotionInfo.data.value} credits</span>
                                        </div>
                                      )}
                                      {promotionInfo.data.promotion_type && (
                                        <div>
                                          <span className="text-white/70">Type:</span>
                                          <span className="font-semibold ml-1 capitalize">
                                            {promotionInfo.data.promotion_type.replace('_', ' ')}
                                          </span>
                                        </div>
                                      )}
                                      {promotionInfo.data.message && (
                                        <div className="pt-1 border-t border-white/20 mt-2">
                                          <p className="text-white">{promotionInfo.data.message}</p>
                                        </div>
                                      )}
                                      {promotionInfo.data.reason && (
                                        <div className="pt-1 border-t border-white/20 mt-2">
                                          <span className="text-white/70">Reason:</span>
                                          <p className="text-white">{promotionInfo.data.reason}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : msg.message_type === 'text' ? (
                                  <p className="text-sm">{msg.content}</p>
                                ) : msg.message_type === 'image' && msg.file_url ? (
                                  <img
                                    src={getFileUrl(msg.file_url)}
                                    alt="Image message"
                                    className="max-w-full rounded-lg"
                                  />
                                ) : msg.message_type === 'voice' && msg.file_url ? (
                                  <audio controls className="max-w-full">
                                    <source src={getFileUrl(msg.file_url)} type="audio/webm" />
                                  </audio>
                                ) : null}
                              </div>
                              <div className={`flex items-center justify-between mt-1 ${
                                isOwn ? 'flex-row-reverse' : ''
                              }`}>
                                <p className="text-xs text-gray-500">
                                  {formatMessageTime(msg.created_at)}
                                  {isOwn && msg.is_read && (
                                    <span className="ml-2 text-blue-400">✓✓</span>
                                  )}
                                </p>
                                {!promotionInfo.isPromotion && (
                                  <div className="relative">
                                    <button
                                      type="button"
                                      title="Message options"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteMenuOpen(deleteMenuOpen === msg.id ? null : msg.id);
                                      }}
                                      className={`${isOwn ? 'text-dark-500 hover:text-dark-700' : 'text-gray-500 hover:text-white'} mx-2`}
                                    >
                                      <MdMoreVert size={16} />
                                    </button>
                                    {deleteMenuOpen === msg.id && (
                                      <div
                                        className="absolute right-0 bottom-full mb-1 bg-dark-200 border border-emerald-700 rounded-lg shadow-lg z-50 min-w-[160px] py-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteMessage(msg.id, false)}
                                          className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-dark-300 flex items-center gap-2"
                                        >
                                          <MdPersonOff size={16} />
                                          Delete for me
                                        </button>
                                        {isOwn && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteMessage(msg.id, true)}
                                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-dark-300 flex items-center gap-2"
                                          >
                                            <MdDeleteForever size={16} />
                                            Delete for everyone
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 bg-dark-300 border-t border-emerald-700 flex-shrink-0">
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mb-3">
                      <div className="relative inline-block">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-24 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={clearImagePreview}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          title="Remove image"
                        >
                          <MdClose size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {isRecording ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-3 bg-dark-200 border-2 border-red-500 rounded-lg px-4 py-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-500 font-mono">{formatRecordingTime(recordingDuration)}</span>
                        <span className="text-gray-400">Recording...</span>
                      </div>
                      <button
                        type="button"
                        onClick={cancelRecording}
                        className="bg-dark-200 text-gray-400 hover:text-white p-3 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <MdClose size={20} />
                      </button>
                      <Button
                        onClick={sendVoiceMessage}
                        disabled={sending}
                        loading={sending}
                        variant="primary"
                      >
                        <MdSend className="text-xl" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      {/* Image attachment button */}
                      <label className="cursor-pointer bg-dark-200 hover:bg-dark-400 text-gray-400 hover:text-emerald-500 p-3 rounded-lg transition-colors" title="Attach image">
                        <MdImage size={20} />
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                          title="Select image to attach"
                        />
                      </label>

                      {/* Voice recording button */}
                      <button
                        type="button"
                        onClick={startRecording}
                        className="bg-dark-200 hover:bg-dark-400 text-gray-400 hover:text-emerald-500 p-3 rounded-lg transition-colors"
                        title="Record voice message"
                      >
                        <MdMic size={20} />
                      </button>

                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !imagePreview && handleSendMessage()}
                        placeholder={imagePreview ? "Press send to share image..." : "Type your message..."}
                        disabled={sending || !!imagePreview}
                        className="flex-1 bg-dark-200 border-2 border-emerald-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                      />
                      <Button
                        onClick={imagePreview ? handleSendImage : handleSendMessage}
                        disabled={(!newMessage.trim() && !imagePreview) || sending}
                        loading={sending}
                        variant="primary"
                      >
                        <MdSend className="text-xl" />
                      </Button>
                    </div>
                  )}
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

      {/* Client Credentials Modal */}
      <Modal
        isOpen={showCredentialsModal}
        onClose={() => {
          setShowCredentialsModal(false);
          setSelectedClientCredentials([]);
          setSelectedClientName('');
        }}
        title={`Game Credentials from ${selectedClientName}`}
        size="lg"
      >
        <div className="space-y-4">
          {loadingClientCredentials ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading credentials...</p>
            </div>
          ) : selectedClientCredentials.length === 0 ? (
            <div className="text-center py-8">
              <FaKey className="text-4xl text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No game credentials from this client</p>
              <p className="text-sm text-gray-500 mt-2">
                This client hasn't assigned any game credentials to you yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedClientCredentials.map((cred) => (
                <CredentialCard key={cred.id} credential={cred} />
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// Full credential card for modal
function CredentialCard({ credential }: { credential: GameCredential }) {
  const [showPassword, setShowPassword] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="bg-dark-300 border border-emerald-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-emerald-500 text-lg">{credential.game_name}</h3>
        {credential.login_url && (
          <Button
            variant="secondary"
            onClick={() => window.open(credential.login_url, '_blank')}
            className="text-sm"
          >
            Open Game
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Username</label>
          <div className="flex items-center gap-2 bg-dark-400 rounded-lg px-3 py-2">
            <span className="text-white font-mono flex-1 truncate">{credential.username}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(credential.username || '', 'Username')}
              className="text-emerald-500 hover:text-emerald-400"
              title="Copy username"
            >
              <MdContentCopy size={16} />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Password</label>
          <div className="flex items-center gap-2 bg-dark-400 rounded-lg px-3 py-2">
            <span className="text-white font-mono flex-1 truncate">
              {showPassword ? credential.password : '••••••••'}
            </span>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-emerald-500 hover:text-emerald-400"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(credential.password || '', 'Password')}
              className="text-emerald-500 hover:text-emerald-400"
              title="Copy password"
            >
              <MdContentCopy size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


