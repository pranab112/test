import React, { useEffect, useState, useRef } from 'react';
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
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { chatApi } from '../../src/api/chat.api';
import { friendsApi } from '../../src/api/friends.api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Avatar, Loading } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import { getFileUrl } from '../../src/config/api.config';
import type { Message, Friend } from '../../src/types';

const { width: screenWidth } = Dimensions.get('window');

export default function ChatScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const { user } = useAuth();
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
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  // Audio playback state
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
      setMessages(messagesData.messages.reverse());
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [friendId]);

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
          <Text
            style={[
              styles.messageTime,
              isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
            ]}
          >
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <Loading fullScreen text="Loading chat..." />;
  }

  return (
    <>
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
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
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
          <View style={styles.recordingContainer}>
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
          <View style={styles.inputContainer}>
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
    </>
  );
}

const styles = StyleSheet.create({
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
  messageTime: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: Colors.background + 'aa',
  },
  otherMessageTime: {
    color: Colors.textMuted,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    backgroundColor: 'rgba(0,0,0,0.95)',
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
});
