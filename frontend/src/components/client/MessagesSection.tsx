import { useState, useEffect, useRef } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import toast from 'react-hot-toast';
import {
  MdMessage,
  MdSend,
  MdImage,
  MdDelete,
  MdSettings,
  MdClose,
  MdAdd,
  MdEdit,
  MdContentCopy,
  MdVisibility,
  MdVisibilityOff,
  MdMic,
  MdCheck,
  MdStar,
  MdMoreVert,
  MdDeleteForever,
  MdPersonOff,
  MdWarning,
} from 'react-icons/md';
import { FaKey, FaUser, FaGamepad, FaLink } from 'react-icons/fa';
import { chatApi, type Conversation, type Message } from '@/api/endpoints';
import { gamesApi, type ClientGame } from '@/api/endpoints/games.api';
import { gameCredentialsApi, type GameCredential } from '@/api/endpoints/gameCredentials.api';
import { promotionsApi } from '@/api/endpoints/promotions.api';
import { useAuth } from '@/contexts/AuthContext';
import { getFileUrl } from '@/config/api.config';

export function MessagesSection() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Player settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [playerCredentials, setPlayerCredentials] = useState<GameCredential[]>([]);
  const [clientGames, setClientGames] = useState<ClientGame[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [loadingGames, setLoadingGames] = useState(false);

  // Add/Edit credential modal state
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [editingCredential, setEditingCredential] = useState<GameCredential | null>(null);
  const [credentialForm, setCredentialForm] = useState({
    game_id: 0,
    game_username: '',
    game_password: '',
  });
  const [savingCredential, setSavingCredential] = useState(false);

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

  // Promotion claim modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingClaimId, setPendingClaimId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Delete credential confirmation state
  const [showDeleteCredentialModal, setShowDeleteCredentialModal] = useState(false);
  const [pendingDeleteCredentialId, setPendingDeleteCredentialId] = useState<number | null>(null);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.friend.id);
      if (selectedConversation.last_message && !selectedConversation.last_message.is_read) {
        chatApi.markMessageAsRead(selectedConversation.last_message.id).catch(console.error);
      }
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
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

  // Voice recording functions
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

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Could not access microphone');
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
    setSendingMessage(true);

    try {
      // Stop recording and wait for the blob
      const audioBlob = await stopRecording();

      if (!audioBlob || audioBlob.size === 0) {
        toast.error('No audio recorded');
        setSendingMessage(false);
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
      setSendingMessage(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Image handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
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

  const handleSendImagePreview = async () => {
    if (!selectedImage || !selectedConversation) return;

    setSendingMessage(true);
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
      setSendingMessage(false);
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
      return '';
    }
  };

  // Player settings functions
  const openPlayerSettings = async () => {
    if (!selectedConversation) return;

    setShowSettingsModal(true);
    setLoadingCredentials(true);
    setLoadingGames(true);

    try {
      const [credsData, gamesData] = await Promise.all([
        gameCredentialsApi.getPlayerCredentials(selectedConversation.friend.id),
        gamesApi.getClientGames(),
      ]);
      setPlayerCredentials(credsData);
      setClientGames(gamesData.filter(g => g.is_active));
    } catch (error) {
      console.error('Failed to load player settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoadingCredentials(false);
      setLoadingGames(false);
    }
  };

  const openAddCredential = () => {
    setEditingCredential(null);
    setCredentialForm({
      game_id: clientGames.length > 0 ? clientGames[0].game_id : 0,
      game_username: '',
      game_password: '',
    });
    setShowCredentialForm(true);
  };

  const openEditCredential = (credential: GameCredential) => {
    setEditingCredential(credential);
    setCredentialForm({
      game_id: credential.game_id,
      game_username: credential.game_username || credential.username || '',
      game_password: credential.game_password || credential.password || '',
    });
    setShowCredentialForm(true);
  };

  const handleSaveCredential = async () => {
    if (!selectedConversation) return;
    if (!credentialForm.game_id || !credentialForm.game_username || !credentialForm.game_password) {
      toast.error('Please fill in all fields');
      return;
    }

    setSavingCredential(true);
    try {
      if (editingCredential) {
        // Update existing
        const updated = await gameCredentialsApi.updateCredential(editingCredential.id, {
          game_username: credentialForm.game_username,
          game_password: credentialForm.game_password,
        });
        setPlayerCredentials(prev =>
          prev.map(c => c.id === editingCredential.id ? updated : c)
        );
        toast.success('Credential updated');
      } else {
        // Create new
        const created = await gameCredentialsApi.createCredential({
          player_id: selectedConversation.friend.id,
          game_id: credentialForm.game_id,
          game_username: credentialForm.game_username,
          game_password: credentialForm.game_password,
        });
        setPlayerCredentials(prev => [...prev, created]);
        toast.success('Credential created');
      }
      setShowCredentialForm(false);
    } catch (error: any) {
      console.error('Failed to save credential:', error);
      toast.error(error.detail || 'Failed to save credential');
    } finally {
      setSavingCredential(false);
    }
  };

  const handleDeleteCredential = async (credentialId: number) => {
    setPendingDeleteCredentialId(credentialId);
    setShowDeleteCredentialModal(true);
  };

  const confirmDeleteCredential = async () => {
    if (!pendingDeleteCredentialId) return;

    try {
      await gameCredentialsApi.deleteCredential(pendingDeleteCredentialId);
      setPlayerCredentials(prev => prev.filter(c => c.id !== pendingDeleteCredentialId));
      toast.success('Credential deleted');
    } catch (error) {
      console.error('Failed to delete credential:', error);
      toast.error('Failed to delete credential');
    } finally {
      setShowDeleteCredentialModal(false);
      setPendingDeleteCredentialId(null);
    }
  };

  const getGameForCredential = (gameId: number) => {
    const clientGame = clientGames.find(cg => cg.game_id === gameId);
    return clientGame?.game;
  };

  // Track local action state for promotion claims (claim_id -> 'approved' | 'rejected')
  const [promotionClaimActions, setPromotionClaimActions] = useState<Record<number, 'approved' | 'rejected'>>({});
  const [processingClaimId, setProcessingClaimId] = useState<number | null>(null);

  // Promotion claim handlers
  const handleApprovePromotionClaim = (claimId: number) => {
    setPendingClaimId(claimId);
    setShowApproveModal(true);
  };

  const confirmApprovePromotionClaim = async () => {
    if (!pendingClaimId) return;

    setProcessingClaimId(pendingClaimId);
    setShowApproveModal(false);
    try {
      await promotionsApi.approvePromotionClaim(pendingClaimId);
      toast.success('Promotion claim approved!');
      // Update local state to show approved status
      setPromotionClaimActions(prev => ({ ...prev, [pendingClaimId]: 'approved' }));
    } catch (error: any) {
      console.error('Failed to approve promotion claim:', error);
      toast.error(error.detail || error.message || 'Failed to approve claim');
    } finally {
      setProcessingClaimId(null);
      setPendingClaimId(null);
    }
  };

  const handleRejectPromotionClaim = (claimId: number) => {
    setPendingClaimId(claimId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmRejectPromotionClaim = async () => {
    if (!pendingClaimId) return;

    setProcessingClaimId(pendingClaimId);
    setShowRejectModal(false);
    try {
      await promotionsApi.rejectPromotionClaim(pendingClaimId, rejectionReason || undefined);
      toast.success('Promotion claim rejected');
      // Update local state to show rejected status
      setPromotionClaimActions(prev => ({ ...prev, [pendingClaimId]: 'rejected' }));
    } catch (error: any) {
      console.error('Failed to reject promotion claim:', error);
      toast.error(error.detail || error.message || 'Failed to reject claim');
    } finally {
      setProcessingClaimId(null);
      setPendingClaimId(null);
      setRejectionReason('');
    }
  };

  // Helper to parse and detect promotion claim messages
  const parsePromotionClaimMessage = (message: Message): { isPromotionClaim: boolean; data?: any; messageType?: string } => {
    if (message.message_type !== 'promotion' || !message.content) {
      return { isPromotionClaim: false };
    }

    try {
      const data = JSON.parse(message.content);
      if (data.type === 'promotion_claim_request') {
        return { isPromotionClaim: true, data, messageType: 'request' };
      }
      if (data.type === 'promotion_claim_approved') {
        return { isPromotionClaim: true, data, messageType: 'approved' };
      }
      if (data.type === 'promotion_claim_rejected') {
        return { isPromotionClaim: true, data, messageType: 'rejected' };
      }
    } catch (e) {
      console.error('Failed to parse promotion message:', e);
    }

    return { isPromotionClaim: false };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] -m-4 sm:-m-6 p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Conversations List */}
        <div className="lg:col-span-1 h-full min-h-0">
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-gold-700 bg-gradient-to-r from-dark-300 to-dark-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gold-500">Conversations</h2>
              <p className="text-sm text-gray-400 mt-1">
                {conversations.filter(c => c.unread_count > 0).length} unread
              </p>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
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
                        {conversation.last_message ? (
                          conversation.last_message.message_type === 'image' ? (
                            <span className="flex items-center gap-1"><MdImage size={14} /> Image</span>
                          ) : conversation.last_message.message_type === 'voice' ? (
                            <span className="flex items-center gap-1"><MdMic size={14} /> Voice message</span>
                          ) : (
                            conversation.last_message.content || ''
                          )
                        ) : 'No messages yet'}
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
        </div>

        {/* Chat Window */}
        {selectedConversation ? (
          <div className="lg:col-span-2 h-full min-h-0">
            <div className="bg-dark-200 border-2 border-gold-700 rounded-lg overflow-hidden h-full flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gold-700 bg-gradient-to-r from-dark-300 to-dark-200 flex-shrink-0">
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
                {/* Settings button */}
                <button
                  type="button"
                  onClick={openPlayerSettings}
                  className="bg-dark-400 hover:bg-dark-300 text-gold-500 p-2 rounded-lg transition-colors"
                  title="Player Settings"
                >
                  <MdSettings size={20} />
                </button>
              </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No messages yet. Start a conversation!</div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.sender_id === user?.id;
                  const promotionClaim = parsePromotionClaimMessage(message);

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          promotionClaim.isPromotionClaim
                            ? promotionClaim.messageType === 'approved'
                              ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white'
                              : promotionClaim.messageType === 'rejected'
                              ? 'bg-gradient-to-br from-red-600 to-rose-600 text-white'
                              : 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
                            : isOwnMessage
                            ? 'bg-gold-gradient text-dark-700'
                            : 'bg-dark-300 text-white'
                        }`}
                      >
                        {promotionClaim.isPromotionClaim && promotionClaim.data ? (
                          // Promotion Claim Messages (Request, Approved, Rejected)
                          (() => {
                            const claimId = promotionClaim.data.claim_id;
                            const localAction = promotionClaimActions[claimId];
                            const msgType = promotionClaim.messageType;

                            // For request messages, check local action and status
                            const isApprovedRequest = msgType === 'request' && (localAction === 'approved' || promotionClaim.data.status === 'approved');
                            const isRejectedRequest = msgType === 'request' && (localAction === 'rejected' || promotionClaim.data.status === 'rejected');
                            const isPendingRequest = msgType === 'request' && !isApprovedRequest && !isRejectedRequest;
                            const isProcessing = processingClaimId === claimId;

                            // For approved/rejected notification messages
                            const isApprovedNotification = msgType === 'approved';
                            const isRejectedNotification = msgType === 'rejected';

                            // Determine header title based on message type
                            let headerTitle = 'Promotion Claim Request';

                            if (isApprovedNotification) {
                              headerTitle = 'Promotion Claim Approved';
                            } else if (isRejectedNotification) {
                              headerTitle = 'Promotion Claim Rejected';
                            }

                            return (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                                  <div className="flex items-center gap-2">
                                    {isApprovedNotification ? (
                                      <MdCheck className="text-green-300" size={20} />
                                    ) : isRejectedNotification ? (
                                      <MdClose className="text-red-300" size={20} />
                                    ) : (
                                      <MdStar className="text-yellow-300" size={20} />
                                    )}
                                    <span className="font-bold">{headerTitle}</span>
                                  </div>
                                  {/* Status Badge - only for request messages */}
                                  {msgType === 'request' && (
                                    <>
                                      {isApprovedRequest && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                                          <MdCheck size={14} className="mr-1" />
                                          Approved
                                        </span>
                                      )}
                                      {isRejectedRequest && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                                          <MdClose size={14} className="mr-1" />
                                          Rejected
                                        </span>
                                      )}
                                      {isPendingRequest && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                          Pending
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>

                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="text-white/70">Promotion:</span>
                                    <div className="font-semibold">{promotionClaim.data.promotion_title}</div>
                                  </div>
                                  {/* Show player info for request and approved notifications */}
                                  {(msgType === 'request' || promotionClaim.data.player_username) && (
                                    <div>
                                      <span className="text-white/70">Player:</span>
                                      <div className="font-semibold">
                                        {promotionClaim.data.player_username || promotionClaim.data.client_name}
                                        {promotionClaim.data.player_level && ` (Level ${promotionClaim.data.player_level})`}
                                      </div>
                                    </div>
                                  )}
                                  {/* Show client name for approved notifications */}
                                  {isApprovedNotification && promotionClaim.data.client_name && (
                                    <div>
                                      <span className="text-white/70">Approved by:</span>
                                      <div className="font-semibold">{promotionClaim.data.client_name}</div>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-white/70">Value:</span>
                                    <div className={`font-semibold ${isRejectedRequest || isRejectedNotification ? 'line-through text-white/50' : ''}`}>
                                      {promotionClaim.data.value} credits
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-white/70">Type:</span>
                                    <div className="font-semibold capitalize">{promotionClaim.data.promotion_type?.replace('_', ' ') || 'Credits'}</div>
                                  </div>
                                  {/* Show new balance for approved notifications */}
                                  {isApprovedNotification && promotionClaim.data.player_new_balance !== undefined && (
                                    <div>
                                      <span className="text-white/70">New Balance:</span>
                                      <div className="font-semibold text-green-300">{promotionClaim.data.player_new_balance} credits</div>
                                    </div>
                                  )}
                                  {/* Show rejection reason if available */}
                                  {isRejectedNotification && promotionClaim.data.rejection_reason && (
                                    <div>
                                      <span className="text-white/70">Reason:</span>
                                      <div className="font-semibold text-red-300">{promotionClaim.data.rejection_reason}</div>
                                    </div>
                                  )}
                                </div>

                                {/* Show buttons only if pending request */}
                                {isPendingRequest && (
                                  <div className="flex gap-2 pt-2">
                                    <button
                                      type="button"
                                      onClick={() => handleApprovePromotionClaim(claimId)}
                                      disabled={isProcessing}
                                      className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white px-3 py-2 rounded font-medium transition-colors flex items-center justify-center gap-1"
                                    >
                                      {isProcessing ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <MdCheck size={16} />
                                          Approve
                                        </>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRejectPromotionClaim(claimId)}
                                      disabled={isProcessing}
                                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white px-3 py-2 rounded font-medium transition-colors flex items-center justify-center gap-1"
                                    >
                                      {isProcessing ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <MdClose size={16} />
                                          Reject
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : message.message_type === 'image' && message.file_url ? (
                          <img
                            src={getFileUrl(message.file_url)}
                            alt="Shared image"
                            className="rounded-lg max-w-full"
                          />
                        ) : message.message_type === 'voice' && message.file_url ? (
                          <div className="flex items-center gap-2">
                            <audio controls className="max-w-full h-8">
                              <source src={getFileUrl(message.file_url)} type="audio/webm" />
                            </audio>
                            {message.duration && (
                              <span className="text-xs">{formatRecordingTime(message.duration)}</span>
                            )}
                          </div>
                        ) : (
                          <p className="break-words">{message.content}</p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-xs ${promotionClaim.isPromotionClaim ? 'text-white/60' : isOwnMessage ? 'text-dark-500' : 'text-gray-500'}`}>
                            {formatMessageTime(message.created_at)}
                          </p>
                          {!promotionClaim.isPromotionClaim && (
                            <div className="relative">
                              <button
                                type="button"
                                title="Message options"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteMenuOpen(deleteMenuOpen === message.id ? null : message.id);
                                }}
                                className={`${isOwnMessage ? 'text-dark-500 hover:text-dark-700' : 'text-gray-500 hover:text-white'} ml-2`}
                              >
                                <MdMoreVert size={16} />
                              </button>
                              {deleteMenuOpen === message.id && (
                                <div
                                  className="absolute right-0 bottom-6 bg-dark-200 border border-gold-700 rounded-lg shadow-lg z-10 min-w-[160px] py-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMessage(message.id, false)}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-dark-300 flex items-center gap-2"
                                  >
                                    <MdPersonOff size={16} />
                                    Delete for me
                                  </button>
                                  {isOwnMessage && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(message.id, true)}
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
                })
              )}
              <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gold-700 bg-dark-300 flex-shrink-0">
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
                    disabled={sendingMessage}
                    loading={sendingMessage}
                    variant="primary"
                  >
                    <MdSend size={20} />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Image attachment */}
                  <label className="cursor-pointer text-gray-400 hover:text-gold-500 transition-colors p-2" title="Attach image">
                    <MdImage size={24} />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      title="Select image to attach"
                      onChange={handleImageSelect}
                    />
                  </label>

                  {/* Voice recording */}
                  <button
                    type="button"
                    onClick={startRecording}
                    className="text-gray-400 hover:text-gold-500 transition-colors p-2"
                    title="Record voice message"
                  >
                    <MdMic size={24} />
                  </button>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !imagePreview && handleSendMessage()}
                    placeholder={imagePreview ? "Press send to share image..." : "Type a message..."}
                    className="flex-1 bg-dark-200 border border-gold-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
                    disabled={sendingMessage || !!imagePreview}
                  />
                  <button
                    type="button"
                    title={imagePreview ? "Send image" : "Send message"}
                    onClick={imagePreview ? handleSendImagePreview : handleSendMessage}
                    disabled={(!newMessage.trim() && !imagePreview) || sendingMessage}
                    className="bg-gold-gradient text-dark-700 p-2 rounded-lg hover:shadow-gold transition-all disabled:opacity-50"
                  >
                    <MdSend size={20} />
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 h-full min-h-0">
            <div className="bg-dark-200 border-2 border-gold-700 rounded-lg h-full flex items-center justify-center">
              <div className="text-center">
                <MdMessage className="text-6xl text-gold-500 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400">Select a conversation to start messaging</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player Settings Modal */}
      {showSettingsModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-gold-700 bg-gradient-to-r from-dark-300 to-dark-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  name={selectedConversation.friend.full_name || selectedConversation.friend.username}
                  size="sm"
                  src={selectedConversation.friend.profile_picture}
                />
                <div>
                  <h3 className="font-bold text-gold-500">
                    {selectedConversation.friend.username}'s Settings
                  </h3>
                  <p className="text-xs text-gray-400">Manage game credentials for this player</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <MdClose size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gold-500 flex items-center gap-2">
                  <FaKey />
                  Game Credentials
                </h4>
                <Button onClick={openAddCredential} variant="primary" className="py-2 px-3 text-sm">
                  <MdAdd className="mr-1" /> Add Credential
                </Button>
              </div>

              {loadingCredentials ? (
                <div className="text-center py-8 text-gray-400">Loading credentials...</div>
              ) : playerCredentials.length === 0 ? (
                <div className="text-center py-8">
                  <FaKey className="text-4xl text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">No credentials set for this player</p>
                  <p className="text-sm text-gray-500">Add credentials to give them access to your games</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {playerCredentials.map((cred) => {
                    const game = getGameForCredential(cred.game_id);
                    return (
                      <PlayerCredentialCard
                        key={cred.id}
                        credential={cred}
                        gameName={game?.display_name || game?.name || 'Unknown Game'}
                        onEdit={() => openEditCredential(cred)}
                        onDelete={() => handleDeleteCredential(cred.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Credential Modal */}
      {showCredentialForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-dark-200 border-2 border-gold-700 rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-gold-700 bg-gradient-to-r from-dark-300 to-dark-200 flex items-center justify-between">
              <h3 className="font-bold text-gold-500">
                {editingCredential ? 'Edit Credential' : 'Add Credential'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCredentialForm(false)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <MdClose size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Game Selection */}
              <div>
                <label className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                  <FaGamepad className="text-gold-500" />
                  Game
                </label>
                <select
                  value={credentialForm.game_id}
                  onChange={(e) => setCredentialForm(prev => ({ ...prev, game_id: Number(e.target.value) }))}
                  disabled={!!editingCredential}
                  title="Select a game"
                  className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
                >
                  {loadingGames ? (
                    <option value="">Loading games...</option>
                  ) : clientGames.length === 0 ? (
                    <option value="">No games available</option>
                  ) : (
                    clientGames.map((cg) => (
                      <option key={cg.game_id} value={cg.game_id}>
                        {cg.game?.display_name || cg.game?.name || `Game ${cg.game_id}`}
                      </option>
                    ))
                  )}
                </select>
                {clientGames.find(cg => cg.game_id === credentialForm.game_id)?.game_link && (
                  <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                    <FaLink />
                    {clientGames.find(cg => cg.game_id === credentialForm.game_id)?.game_link}
                  </p>
                )}
              </div>

              {/* Username */}
              <div>
                <label className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                  <FaUser className="text-gold-500" />
                  Username
                </label>
                <input
                  type="text"
                  value={credentialForm.game_username}
                  onChange={(e) => setCredentialForm(prev => ({ ...prev, game_username: e.target.value }))}
                  placeholder="Enter username"
                  className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                  <FaKey className="text-gold-500" />
                  Password
                </label>
                <input
                  type="text"
                  value={credentialForm.game_password}
                  onChange={(e) => setCredentialForm(prev => ({ ...prev, game_password: e.target.value }))}
                  placeholder="Enter password"
                  className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowCredentialForm(false)}
                  variant="secondary"
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveCredential}
                  disabled={savingCredential || !credentialForm.game_id || !credentialForm.game_username || !credentialForm.game_password}
                  loading={savingCredential}
                  variant="primary"
                  fullWidth
                >
                  {editingCredential ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Promotion Claim Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setPendingClaimId(null);
        }}
        title="Approve Promotion Claim"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <MdCheck className="text-green-500 text-2xl flex-shrink-0" />
            <p className="text-gray-300">
              Are you sure you want to approve this promotion claim? The player will receive the credited amount.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowApproveModal(false);
                setPendingClaimId(null);
              }}
              variant="secondary"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApprovePromotionClaim}
              variant="primary"
              fullWidth
              className="!bg-green-600 hover:!bg-green-700"
            >
              Approve Claim
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Promotion Claim Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setPendingClaimId(null);
          setRejectionReason('');
        }}
        title="Reject Promotion Claim"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <MdWarning className="text-red-500 text-2xl flex-shrink-0" />
            <p className="text-gray-300">
              Are you sure you want to reject this promotion claim?
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Reason for rejection (optional)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full bg-dark-300 border-2 border-gold-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500 resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowRejectModal(false);
                setPendingClaimId(null);
                setRejectionReason('');
              }}
              variant="secondary"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRejectPromotionClaim}
              variant="primary"
              fullWidth
              className="!bg-red-600 hover:!bg-red-700"
            >
              Reject Claim
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Credential Confirmation Modal */}
      <Modal
        isOpen={showDeleteCredentialModal}
        onClose={() => {
          setShowDeleteCredentialModal(false);
          setPendingDeleteCredentialId(null);
        }}
        title="Delete Credential"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <MdWarning className="text-red-500 text-2xl flex-shrink-0" />
            <p className="text-gray-300">
              Are you sure you want to delete this credential? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowDeleteCredentialModal(false);
                setPendingDeleteCredentialId(null);
              }}
              variant="secondary"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteCredential}
              variant="primary"
              fullWidth
              className="!bg-red-600 hover:!bg-red-700"
            >
              Delete Credential
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PlayerCredentialCard({
  credential,
  gameName,
  onEdit,
  onDelete,
}: {
  credential: GameCredential;
  gameName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="bg-dark-300 border-2 border-gold-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gold-500">{gameName}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="text-gold-500 hover:text-gold-400 transition-colors"
            title="Edit"
          >
            <MdEdit size={18} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-red-500 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <MdDelete size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Username */}
        <div className="bg-dark-200 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Username</span>
            <button
              type="button"
              onClick={() => copyToClipboard(credential.game_username || credential.username || '', 'Username')}
              className="text-gold-500 hover:text-gold-400 transition-colors"
              title="Copy username"
            >
              <MdContentCopy size={14} />
            </button>
          </div>
          <p className="text-white font-mono text-sm truncate">{credential.game_username || credential.username}</p>
        </div>

        {/* Password */}
        <div className="bg-dark-200 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Password</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gold-500 hover:text-gold-400 transition-colors"
                title={showPassword ? 'Hide' : 'Show'}
              >
                {showPassword ? <MdVisibilityOff size={14} /> : <MdVisibility size={14} />}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(credential.game_password || credential.password || '', 'Password')}
                className="text-gold-500 hover:text-gold-400 transition-colors"
                title="Copy password"
              >
                <MdContentCopy size={14} />
              </button>
            </div>
          </div>
          <p className="text-white font-mono text-sm truncate">
            {showPassword ? (credential.game_password || credential.password) : '••••••••'}
          </p>
        </div>
      </div>
    </div>
  );
}
