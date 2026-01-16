import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { chatApi } from '../../src/api/chat.api';
import { friendsApi } from '../../src/api/friends.api';
import { gameCredentialsApi } from '../../src/api/gameCredentials.api';
import { gamesApi } from '../../src/api/games.api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useChat } from '../../src/contexts/ChatContext';
import { Avatar, Loading, Card } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import { getFileUrl } from '../../src/config/api.config';
import type { Message, Friend, GameCredential, ClientGame } from '../../src/types';

const { width: screenWidth } = Dimensions.get('window');

export default function ChatScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const { user } = useAuth();
  const { refreshUnreadCount, setActiveChatFriendId } = useChat();
  const insets = useSafeAreaInsets();
  const [friend, setFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Media state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [sendingImage, setSendingImage] = useState(false);

  // Voice recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio playback state
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Game credentials state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [gameCredentials, setGameCredentials] = useState<GameCredential[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);

  // Credential management state (for clients)
  const [showAddCredentialModal, setShowAddCredentialModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState<GameCredential | null>(null);
  const [clientGames, setClientGames] = useState<ClientGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [credentialUsername, setCredentialUsername] = useState('');
  const [credentialPassword, setCredentialPassword] = useState('');
  const [savingCredential, setSavingCredential] = useState(false);

  const loadData = async () => {
    if (!friendId) return;

    try {
      // Load friend info and messages
      const [friendsData, messagesData] = await Promise.all([
        friendsApi.getFriends(),
        chatApi.getMessages(parseInt(friendId)),
      ]);

      const friendInfo = friendsData.find((f) => f.id === parseInt(friendId));
      setFriend(friendInfo || null);

      // Backend returns messages in DESC order (newest first) for pagination,
      // then reverses them - but let's verify and ensure chronological order
      console.log('Messages loaded:', messagesData);
      console.log('Messages array:', messagesData.messages);
      console.log('Messages count:', messagesData.messages?.length);

      if (messagesData.messages && Array.isArray(messagesData.messages)) {
        // Ensure messages are in chronological order (oldest first, newest last)
        // This way newest messages appear at the bottom of the chat
        const sortedMessages = [...messagesData.messages].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(sortedMessages);
      } else {
        console.error('Invalid messages data:', messagesData);
        setMessages([]);
      }

      // Backend already marks messages as read when fetching
      // Refresh the global unread count to sync the badge
      // Small delay to ensure the backend has committed the read status
      setTimeout(() => {
        refreshUnreadCount();
      }, 500);
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [friendId]);

  // Track active chat and refresh unread count when entering and leaving the chat screen
  useFocusEffect(
    useCallback(() => {
      // Set active chat so WebSocket handler knows not to increment count for this conversation
      if (friendId) {
        setActiveChatFriendId(parseInt(friendId));
      }

      // Refresh when screen gains focus (in case messages were read)
      refreshUnreadCount();

      // Return cleanup function that runs when screen loses focus
      return () => {
        // Clear active chat when leaving
        setActiveChatFriendId(null);
        refreshUnreadCount();
      };
    }, [friendId, refreshUnreadCount, setActiveChatFriendId])
  );

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !friendId) return;

    setSending(true);
    try {
      const sentMessage = await chatApi.sendTextMessage(
        parseInt(friendId),
        newMessage.trim()
      );
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage('');

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Image picker and send
  const pickImage = async () => {
    setShowAttachMenu(false);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    setShowAttachMenu(false);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSendImage = async () => {
    if (!selectedImage || !friendId || sendingImage) return;

    setSendingImage(true);
    try {
      const sentMessage = await chatApi.sendImageMessage(
        parseInt(friendId),
        selectedImage,
        imageCaption.trim() || undefined
      );
      setMessages((prev) => [...prev, sentMessage]);
      setSelectedImage(null);
      setImageCaption('');

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to send image');
    } finally {
      setSendingImage(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your microphone.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    setIsRecording(false);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri && friendId && recordingDuration >= 1) {
        await sendVoiceMessage(uri, recordingDuration);
      } else if (recordingDuration < 1) {
        Alert.alert('Too Short', 'Voice message must be at least 1 second');
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }

    setRecordingDuration(0);
  };

  const cancelRecording = async () => {
    if (!recording) return;

    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    setIsRecording(false);
    setRecordingDuration(0);

    try {
      await recording.stopAndUnloadAsync();
      setRecording(null);
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  const sendVoiceMessage = async (uri: string, duration: number) => {
    if (!friendId) return;

    setSending(true);
    try {
      const sentMessage = await chatApi.sendVoiceMessage(
        parseInt(friendId),
        uri,
        duration
      );
      setMessages((prev) => [...prev, sentMessage]);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to send voice message');
    } finally {
      setSending(false);
    }
  };

  // Audio playback
  const playAudio = async (audioUrl: string, messageId: number) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: getFileUrl(audioUrl) },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingAudio(messageId);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAudio(null);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play voice message');
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      setPlayingAudio(null);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [sound]);

  // Load game credentials
  const handleOpenCredentials = async () => {
    setShowCredentialsModal(true);

    // For clients, always load client games if not already loaded
    if (user?.user_type === 'client' && friend?.user_type === 'player' && friendId && clientGames.length === 0) {
      try {
        const games = await gamesApi.getClientGames();
        setClientGames(games);
      } catch (error) {
        console.error('Error loading client games:', error);
      }
    }

    // Always refresh credentials when opening the modal
    setLoadingCredentials(true);
    try {
      // If current user is a player, get their own credentials
      // If current user is a client and friend is a player, get that player's credentials
      if (user?.user_type === 'player') {
        const credentials = await gameCredentialsApi.getMyCredentials();
        setGameCredentials(credentials);
      } else if (user?.user_type === 'client' && friend?.user_type === 'player' && friendId) {
        const [credentials, games] = await Promise.all([
          gameCredentialsApi.getPlayerCredentials(parseInt(friendId)),
          gamesApi.getClientGames(),
        ]);
        setGameCredentials(credentials);
        setClientGames(games);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    } finally {
      setLoadingCredentials(false);
    }
  };

  // Open add credential modal
  const handleOpenAddCredential = async () => {
    setEditingCredential(null);
    setSelectedGameId(null);
    setCredentialUsername('');
    setCredentialPassword('');
    setShowAddCredentialModal(true);

    // Make sure client games are loaded
    if (user?.user_type === 'client' && clientGames.length === 0) {
      try {
        const games = await gamesApi.getClientGames();
        setClientGames(games);
      } catch (error) {
        console.error('Error loading client games:', error);
      }
    }
  };

  // Open edit credential modal
  const handleOpenEditCredential = (credential: GameCredential) => {
    setEditingCredential(credential);
    setSelectedGameId(credential.game_id);
    setCredentialUsername(credential.game_username);
    setCredentialPassword(credential.game_password);
    setShowAddCredentialModal(true);
  };

  // Save credential (add or update)
  const handleSaveCredential = async () => {
    if (!selectedGameId || !credentialUsername.trim() || !credentialPassword.trim() || !friendId) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSavingCredential(true);
    try {
      if (editingCredential) {
        // Update existing credential
        await gameCredentialsApi.updateCredentials(editingCredential.id, {
          game_username: credentialUsername.trim(),
          game_password: credentialPassword.trim(),
        });
        Alert.alert('Success', 'Credential updated successfully');
      } else {
        // Create new credential
        await gameCredentialsApi.createCredentials({
          player_id: parseInt(friendId),
          game_id: selectedGameId,
          game_username: credentialUsername.trim(),
          game_password: credentialPassword.trim(),
        });
        Alert.alert('Success', 'Credential created successfully');
      }

      // Refresh credentials
      const credentials = await gameCredentialsApi.getPlayerCredentials(parseInt(friendId));
      setGameCredentials(credentials);
      setShowAddCredentialModal(false);
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to save credential');
    } finally {
      setSavingCredential(false);
    }
  };

  // Delete credential
  const handleDeleteCredential = (credential: GameCredential) => {
    Alert.alert(
      'Delete Credential',
      `Are you sure you want to delete the credential for ${credential.game_display_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await gameCredentialsApi.deleteCredentials(credential.id);
              setGameCredentials((prev) => prev.filter((c) => c.id !== credential.id));
              Alert.alert('Success', 'Credential deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error?.detail || 'Failed to delete credential');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.sender_id === user?.id;
    const showAvatar =
      !isOwnMessage &&
      (index === 0 || messages[index - 1]?.sender_id !== item.sender_id);

    const renderContent = () => {
      if (item.message_type === 'image' && item.file_url) {
        return (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setPreviewImage(getFileUrl(item.file_url!))}
          >
            <Image
              source={{ uri: getFileUrl(item.file_url) }}
              style={styles.messageImage}
              resizeMode="cover"
            />
            {item.content && (
              <Text
                style={[
                  styles.imageCaption,
                  isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                ]}
              >
                {item.content}
              </Text>
            )}
          </TouchableOpacity>
        );
      }

      if (item.message_type === 'voice' && item.file_url) {
        const isPlaying = playingAudio === item.id;
        return (
          <TouchableOpacity
            style={styles.voiceMessage}
            onPress={() => (isPlaying ? stopAudio() : playAudio(item.file_url!, item.id))}
          >
            <View style={[styles.playButton, isOwnMessage && styles.ownPlayButton]}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color={isOwnMessage ? Colors.primary : Colors.background}
              />
            </View>
            <View style={styles.voiceWaveform}>
              {[...Array(12)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveformBar,
                    isOwnMessage ? styles.ownWaveformBar : styles.otherWaveformBar,
                    { height: 8 + Math.random() * 16 },
                  ]}
                />
              ))}
            </View>
            <Text
              style={[
                styles.voiceDuration,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {item.duration ? formatDuration(item.duration) : '0:00'}
            </Text>
          </TouchableOpacity>
        );
      }

      // Credit transfer message
      if (item.message_type === 'credit_transfer') {
        const isAddCredits = item.transfer_type === 'add';
        return (
          <View style={styles.transferMessage}>
            <View style={[styles.transferIconBg, isAddCredits ? styles.transferAddBg : styles.transferDeductBg]}>
              <Ionicons
                name={isAddCredits ? 'arrow-down' : 'arrow-up'}
                size={20}
                color={isAddCredits ? Colors.success : Colors.error}
              />
            </View>
            <View style={styles.transferInfo}>
              <Text style={[styles.transferLabel, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
                {isAddCredits ? 'Credits Added' : 'Credits Deducted'}
              </Text>
              <Text style={[styles.transferAmount, isAddCredits ? styles.transferAddText : styles.transferDeductText]}>
                {isAddCredits ? '+' : '-'}{item.transfer_amount || 0} GC
              </Text>
            </View>
            <View style={styles.transferBadge}>
              <Ionicons name="wallet" size={14} color={Colors.primary} />
            </View>
          </View>
        );
      }

      // Promotion message
      if (item.message_type === 'promotion') {
        return (
          <View style={styles.promotionMessage}>
            {item.promotion_image_url && (
              <Image
                source={{ uri: getFileUrl(item.promotion_image_url) }}
                style={styles.promotionImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.promotionContent}>
              <View style={styles.promotionHeader}>
                <Ionicons name="megaphone" size={16} color={Colors.primary} />
                <Text style={styles.promotionTag}>Promotion</Text>
              </View>
              <Text style={[styles.promotionTitle, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
                {item.promotion_title || item.content || 'New Promotion'}
              </Text>
              {item.content && item.promotion_title && (
                <Text style={[styles.promotionDescription, isOwnMessage ? { color: Colors.background + 'cc' } : { color: Colors.textSecondary }]}>
                  {item.content}
                </Text>
              )}
            </View>
          </View>
        );
      }

      // Check if content is JSON (system message like promotion_claim_request, etc.)
      if (item.content && item.content.startsWith('{') && item.content.includes('"type"')) {
        try {
          const jsonData = JSON.parse(item.content);

          // Promotion claim request
          if (jsonData.type === 'promotion_claim_request') {
            return (
              <View style={styles.systemMessage}>
                <Ionicons name="gift" size={20} color={Colors.primary} />
                <View style={styles.systemMessageContent}>
                  <Text style={[styles.systemMessageTitle, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
                    Promotion Claimed
                  </Text>
                  <Text style={[styles.systemMessageText, isOwnMessage ? { color: Colors.background + 'cc' } : { color: Colors.textSecondary }]}>
                    {jsonData.promotion_title || 'Promotion'} - {jsonData.value || 0} GC
                  </Text>
                </View>
              </View>
            );
          }

          // Promotion claim approved
          if (jsonData.type === 'promotion_claim_approved') {
            return (
              <View style={styles.systemMessage}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <View style={styles.systemMessageContent}>
                  <Text style={[styles.systemMessageTitle, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
                    Promotion Approved
                  </Text>
                  <Text style={[styles.systemMessageText, isOwnMessage ? { color: Colors.background + 'cc' } : { color: Colors.textSecondary }]}>
                    {jsonData.promotion_title || 'Promotion'} - +{jsonData.value || 0} GC
                  </Text>
                  {jsonData.player_new_balance !== undefined && (
                    <Text style={[styles.systemMessageBalance, { color: Colors.success }]}>
                      New Balance: {jsonData.player_new_balance} GC
                    </Text>
                  )}
                </View>
              </View>
            );
          }

          // Promotion claim rejected
          if (jsonData.type === 'promotion_claim_rejected') {
            return (
              <View style={styles.systemMessage}>
                <Ionicons name="close-circle" size={20} color={Colors.error} />
                <View style={styles.systemMessageContent}>
                  <Text style={[styles.systemMessageTitle, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
                    Promotion Rejected
                  </Text>
                  <Text style={[styles.systemMessageText, isOwnMessage ? { color: Colors.background + 'cc' } : { color: Colors.textSecondary }]}>
                    {jsonData.promotion_title || 'Promotion'}
                  </Text>
                  {jsonData.reason && (
                    <Text style={[styles.systemMessageText, { color: Colors.error }]}>
                      Reason: {jsonData.reason}
                    </Text>
                  )}
                </View>
              </View>
            );
          }
        } catch (e) {
          // Not valid JSON, fall through to default text rendering
        }
      }

      return (
        <Text
          style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
          ]}
        >
          {item.content}
        </Text>
      );
    };

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isOwnMessage && showAvatar && (
          <Avatar
            source={friend?.profile_picture}
            name={friend?.full_name || friend?.username}
            size="sm"
            style={styles.messageAvatar}
          />
        )}
        {!isOwnMessage && !showAvatar && <View style={styles.avatarPlaceholder} />}
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
            item.message_type === 'image' && styles.imageBubble,
          ]}
        >
          {renderContent()}
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
              ]}
            >
              {formatTime(item.created_at)}
            </Text>
            {isOwnMessage && (
              <View style={styles.messageStatus}>
                {item.is_read ? (
                  // Double checkmark for seen/read
                  <View style={styles.doubleCheck}>
                    <Ionicons name="checkmark" size={14} color={Colors.info} />
                    <Ionicons name="checkmark" size={14} color={Colors.info} style={styles.secondCheck} />
                  </View>
                ) : (
                  // Single checkmark for delivered
                  <Ionicons name="checkmark" size={14} color={Colors.background + 'aa'} />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return <Loading fullScreen text="Loading chat..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <Avatar
                source={friend?.profile_picture}
                name={friend?.full_name || friend?.username}
                size="sm"
                showOnlineStatus
                isOnline={friend?.is_online}
              />
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>
                  {friend?.full_name || friend?.username}
                </Text>
                <Text style={styles.headerStatus}>
                  {friend?.is_online ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleOpenCredentials} style={styles.credentialsButton}>
              <Ionicons name="game-controller" size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          }
        />

        {/* Recording UI */}
        {isRecording ? (
          <View style={[styles.recordingContainer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
            <TouchableOpacity style={styles.cancelRecordButton} onPress={cancelRecording}>
              <Ionicons name="close" size={24} color={Colors.error} />
            </TouchableOpacity>
            <View style={styles.recordingInfo}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording...</Text>
              <Text style={styles.recordingDuration}>{formatDuration(recordingDuration)}</Text>
            </View>
            <TouchableOpacity style={styles.sendRecordButton} onPress={stopRecording}>
              <Ionicons name="send" size={20} color={Colors.background} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => setShowAttachMenu(true)}
            >
              <Ionicons name="add-circle" size={28} color={Colors.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={1000}
            />
            {newMessage.trim() ? (
              <TouchableOpacity
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={sending}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={!sending ? Colors.background : Colors.textMuted}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micButton} onPress={startRecording}>
                <Ionicons name="mic" size={24} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Attach Menu Modal */}
      <Modal
        visible={showAttachMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <Pressable style={styles.attachOverlay} onPress={() => setShowAttachMenu(false)}>
          <View style={styles.attachMenu}>
            <TouchableOpacity style={styles.attachOption} onPress={takePhoto}>
              <View style={[styles.attachIconBg, { backgroundColor: Colors.info + '20' }]}>
                <Ionicons name="camera" size={24} color={Colors.info} />
              </View>
              <Text style={styles.attachLabel}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={pickImage}>
              <View style={[styles.attachIconBg, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="image" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.attachLabel}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSelectedImage(null);
          setImageCaption('');
        }}
      >
        <View style={styles.imagePreviewContainer}>
          <View style={styles.imagePreviewHeader}>
            <TouchableOpacity
              onPress={() => {
                setSelectedImage(null);
                setImageCaption('');
              }}
            >
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.imagePreviewTitle}>Send Photo</Text>
            <View style={{ width: 28 }} />
          </View>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          <View style={styles.captionContainer}>
            <TextInput
              style={styles.captionInput}
              value={imageCaption}
              onChangeText={setImageCaption}
              placeholder="Add a caption..."
              placeholderTextColor={Colors.textMuted}
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.sendImageButton, sendingImage && styles.sendButtonDisabled]}
              onPress={handleSendImage}
              disabled={sendingImage}
            >
              <Ionicons
                name="send"
                size={20}
                color={!sendingImage ? Colors.background : Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full Image Preview Modal */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <Pressable style={styles.fullImageOverlay} onPress={() => setPreviewImage(null)}>
          <TouchableOpacity style={styles.closeFullImage} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>

      {/* Game Credentials Modal */}
      <Modal
        visible={showCredentialsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCredentialsModal(false)}
      >
        <View style={styles.credentialsOverlay}>
          <View style={styles.credentialsContent}>
            <View style={styles.credentialsHeader}>
              <Text style={styles.credentialsTitle}>Game Credentials</Text>
              <View style={styles.credentialsHeaderRight}>
                {user?.user_type === 'client' && friend?.user_type === 'player' && (
                  <TouchableOpacity
                    onPress={handleOpenAddCredential}
                    style={styles.addCredentialButton}
                  >
                    <Ionicons name="add" size={24} color={Colors.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowCredentialsModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {loadingCredentials ? (
              <View style={styles.credentialsLoading}>
                <Loading text="Loading credentials..." />
              </View>
            ) : gameCredentials.length === 0 ? (
              <View style={styles.credentialsEmpty}>
                <Ionicons name="key-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.credentialsEmptyText}>No game credentials found</Text>
                <Text style={styles.credentialsEmptySubtext}>
                  {user?.user_type === 'player'
                    ? 'Your client has not assigned any game credentials yet.'
                    : 'No credentials have been assigned to this player.'}
                </Text>
                {user?.user_type === 'client' && friend?.user_type === 'player' && (
                  <TouchableOpacity
                    style={styles.addCredentialButtonLarge}
                    onPress={handleOpenAddCredential}
                  >
                    <Ionicons name="add" size={20} color={Colors.background} />
                    <Text style={styles.addCredentialButtonText}>Add Credential</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                data={gameCredentials}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.credentialCard}>
                    <View style={styles.credentialHeader}>
                      <View style={styles.credentialHeaderLeft}>
                        <Ionicons name="game-controller" size={24} color={Colors.primary} />
                        <Text style={styles.credentialGameName}>{item.game_display_name}</Text>
                      </View>
                      {user?.user_type === 'client' && (
                        <View style={styles.credentialActions}>
                          <TouchableOpacity
                            onPress={() => handleOpenEditCredential(item)}
                            style={styles.credentialActionButton}
                          >
                            <Ionicons name="pencil" size={18} color={Colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteCredential(item)}
                            style={styles.credentialActionButton}
                          >
                            <Ionicons name="trash" size={18} color={Colors.error} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <View style={styles.credentialRow}>
                      <Text style={styles.credentialLabel}>Username:</Text>
                      <Text style={styles.credentialValue}>{item.game_username}</Text>
                    </View>
                    <View style={styles.credentialRow}>
                      <Text style={styles.credentialLabel}>Password:</Text>
                      <Text style={styles.credentialValue}>{item.game_password}</Text>
                    </View>
                    {item.login_url && (
                      <View style={styles.credentialRow}>
                        <Text style={styles.credentialLabel}>Login URL:</Text>
                        <Text style={[styles.credentialValue, styles.credentialUrl]} numberOfLines={1}>
                          {item.login_url}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                contentContainerStyle={styles.credentialsList}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Add/Edit Credential Modal */}
      <Modal
        visible={showAddCredentialModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCredentialModal(false)}
      >
        <View style={styles.credentialsOverlay}>
          <View style={styles.credentialsContent}>
            <View style={styles.credentialsHeader}>
              <Text style={styles.credentialsTitle}>
                {editingCredential ? 'Edit Credential' : 'Add Credential'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddCredentialModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              {/* Game Selection - only show for new credentials */}
              {!editingCredential && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Select Game</Text>
                  <View style={styles.gameSelector}>
                    {clientGames.map((clientGame) => (
                      <TouchableOpacity
                        key={clientGame.id}
                        style={[
                          styles.gameOption,
                          selectedGameId === clientGame.game_id && styles.gameOptionSelected,
                        ]}
                        onPress={() => setSelectedGameId(clientGame.game_id)}
                      >
                        <Ionicons
                          name="game-controller"
                          size={20}
                          color={selectedGameId === clientGame.game_id ? Colors.primary : Colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.gameOptionText,
                            selectedGameId === clientGame.game_id && styles.gameOptionTextSelected,
                          ]}
                        >
                          {clientGame.game?.display_name || `Game ${clientGame.game_id}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {clientGames.length === 0 && (
                    <Text style={styles.noGamesText}>No games configured. Add games in Settings.</Text>
                  )}
                </View>
              )}

              {/* Username Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Game Username</Text>
                <TextInput
                  style={styles.formInput}
                  value={credentialUsername}
                  onChangeText={setCredentialUsername}
                  placeholder="Enter game username"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              {/* Password Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Game Password</Text>
                <TextInput
                  style={styles.formInput}
                  value={credentialPassword}
                  onChangeText={setCredentialPassword}
                  placeholder="Enter game password"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[
                  styles.saveCredentialButton,
                  savingCredential && styles.saveCredentialButtonDisabled,
                ]}
                onPress={handleSaveCredential}
                disabled={savingCredential}
              >
                <Text style={styles.saveCredentialButtonText}>
                  {savingCredential ? 'Saving...' : editingCredential ? 'Update Credential' : 'Add Credential'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: Spacing.sm,
  },
  headerName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  headerStatus: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  backButton: {
    marginRight: Spacing.sm,
  },
  messagesList: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: Spacing.sm,
  },
  avatarPlaceholder: {
    width: 32,
    marginRight: Spacing.sm,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  ownMessageBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  ownMessageText: {
    color: Colors.background,
  },
  otherMessageText: {
    color: Colors.text,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.xs,
    gap: 4,
  },
  messageTime: {
    fontSize: FontSize.xs,
  },
  ownMessageTime: {
    color: Colors.background + 'aa',
  },
  otherMessageTime: {
    color: Colors.textMuted,
  },
  messageStatus: {
    marginLeft: 2,
  },
  doubleCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondCheck: {
    marginLeft: -8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  // New styles for media messages
  attachButton: {
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  micButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  // Recording styles
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelRecordButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.error,
  },
  recordingText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  recordingDuration: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  sendRecordButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Image message styles
  imageBubble: {
    padding: Spacing.xs,
    maxWidth: screenWidth * 0.65,
  },
  messageImage: {
    width: screenWidth * 0.6,
    height: screenWidth * 0.6,
    borderRadius: BorderRadius.md,
  },
  imageCaption: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  // Voice message styles
  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 180,
    gap: Spacing.sm,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownPlayButton: {
    backgroundColor: Colors.background,
  },
  voiceWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 24,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
  },
  ownWaveformBar: {
    backgroundColor: Colors.background + '80',
  },
  otherWaveformBar: {
    backgroundColor: Colors.textMuted,
  },
  voiceDuration: {
    fontSize: FontSize.xs,
    minWidth: 36,
    textAlign: 'right',
  },
  // Attach menu styles
  attachOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayMedium,
    justifyContent: 'flex-end',
  },
  attachMenu: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    gap: Spacing.xl,
    justifyContent: 'center',
  },
  attachOption: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  attachIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachLabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  // Image preview styles
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  imagePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },
  imagePreviewTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  captionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  captionInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  sendImageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Full image preview styles
  fullImageOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullImage: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: Spacing.sm,
  },
  fullImage: {
    width: screenWidth,
    height: screenWidth,
  },
  // Game credentials button
  credentialsButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  // Credentials modal styles
  credentialsOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayMedium,
    justifyContent: 'flex-end',
  },
  credentialsContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '80%',
  },
  credentialsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  credentialsTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  credentialsLoading: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  credentialsEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  credentialsEmptyText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  credentialsEmptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  credentialsList: {
    paddingBottom: Spacing.md,
  },
  credentialCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  credentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  credentialHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  credentialGameName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  credentialActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  credentialActionButton: {
    padding: Spacing.xs,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  credentialLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  credentialValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  credentialUrl: {
    color: Colors.primary,
    flex: 1,
    marginLeft: Spacing.sm,
    textAlign: 'right',
  },
  // Header right section
  credentialsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  addCredentialButton: {
    padding: Spacing.xs,
  },
  addCredentialButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  addCredentialButtonText: {
    color: Colors.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  // Form styles for add/edit modal
  formContainer: {
    paddingTop: Spacing.md,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  formInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  gameSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  gameOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gameOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  gameOptionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  gameOptionTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  noGamesText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
  saveCredentialButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveCredentialButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  saveCredentialButtonText: {
    color: Colors.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  // Credit transfer message styles
  transferMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    gap: Spacing.sm,
  },
  transferIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferAddBg: {
    backgroundColor: Colors.success + '20',
  },
  transferDeductBg: {
    backgroundColor: Colors.error + '20',
  },
  transferInfo: {
    flex: 1,
  },
  transferLabel: {
    fontSize: FontSize.sm,
    marginBottom: 2,
  },
  transferAmount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  transferAddText: {
    color: Colors.success,
  },
  transferDeductText: {
    color: Colors.error,
  },
  transferBadge: {
    padding: Spacing.xs,
  },
  // Promotion message styles
  promotionMessage: {
    minWidth: 220,
    maxWidth: screenWidth * 0.65,
  },
  promotionImage: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  promotionContent: {
    paddingHorizontal: Spacing.xs,
  },
  promotionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  promotionTag: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  promotionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  promotionDescription: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  // System message styles (for promotion claims, etc.)
  systemMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 200,
    gap: Spacing.sm,
  },
  systemMessageContent: {
    flex: 1,
  },
  systemMessageTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: 2,
  },
  systemMessageText: {
    fontSize: FontSize.sm,
  },
  systemMessageBalance: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.xs,
  },
});
