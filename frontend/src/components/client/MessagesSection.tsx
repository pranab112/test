import { useState, useEffect, useRef } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
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
} from 'react-icons/md';
import { FaKey, FaUser, FaGamepad, FaLink } from 'react-icons/fa';
import { chatApi, type Conversation, type Message } from '@/api/endpoints';
import { gamesApi, type ClientGame } from '@/api/endpoints/games.api';
import { gameCredentialsApi, type GameCredential } from '@/api/endpoints/gameCredentials.api';
import { gameCredentialsApi, type GameCredential } from '@/api/endpoints/gameCredentials.api';
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

  const handleDeleteMessage = async (messageId: number) => {
    try {
      await chatApi.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Message deleted');
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
      username: credential.game_username || credential.username || '',
      password: credential.game_password || credential.password || '',
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
    if (!confirm('Are you sure you want to delete this credential?')) return;

    try {
      await gameCredentialsApi.deleteCredential(credentialId);
      setPlayerCredentials(prev => prev.filter(c => c.id !== credentialId));
      toast.success('Credential deleted');
    } catch (error) {
      console.error('Failed to delete credential:', error);
      toast.error('Failed to delete credential');
    }
  };

  const getGameForCredential = (gameId: number) => {
    const clientGame = clientGames.find(cg => cg.game_id === gameId);
    return clientGame?.game;
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
