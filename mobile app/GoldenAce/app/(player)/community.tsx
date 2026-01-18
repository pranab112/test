import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { communityApi, CommunityPost, PostComment } from '../../src/api/community.api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Card, Avatar, Badge, Loading, EmptyState, Button, Input } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import { getFileUrl } from '../../src/config/api.config';

export default function CommunityScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New post modal
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Comments modal
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadPosts = async () => {
    try {
      const data = await communityApi.getPosts();
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedImage) {
      Alert.alert('Error', 'Please enter some content or select an image');
      return;
    }

    setPosting(true);
    try {
      if (selectedImage) {
        // Post with image
        await communityApi.createPostWithImage(newPostContent.trim(), selectedImage);
      } else {
        // Text only post
        await communityApi.createPost({ content: newPostContent.trim() });
      }
      Alert.alert('Success', 'Post created successfully');
      setShowNewPostModal(false);
      setNewPostContent('');
      setSelectedImage(null);
      await loadPosts();
    } catch (error: any) {
      console.error('Post creation error:', error);
      Alert.alert('Error', error?.detail || error?.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const pickImage = async () => {
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

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  const handleLikePost = async (post: CommunityPost) => {
    try {
      if (post.is_liked_by_me) {
        await communityApi.unlikePost(post.id);
      } else {
        await communityApi.likePost(post.id);
      }
      // Update local state
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                is_liked_by_me: !p.is_liked_by_me,
                likes_count: p.is_liked_by_me ? p.likes_count - 1 : p.likes_count + 1,
              }
            : p
        )
      );
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleDeletePost = async (postId: number) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await communityApi.deletePost(postId);
              setPosts((prev) => prev.filter((p) => p.id !== postId));
              Alert.alert('Success', 'Post deleted');
            } catch (error: any) {
              Alert.alert('Error', error?.detail || 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const openComments = async (post: CommunityPost) => {
    setSelectedPost(post);
    setShowCommentsModal(true);
    setLoadingComments(true);
    try {
      const data = await communityApi.getComments(post.id);
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;

    setSubmittingComment(true);
    try {
      const comment = await communityApi.addComment(selectedPost.id, {
        content: newComment.trim(),
      });
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      // Update comment count in posts list
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id
            ? { ...p, comments_count: p.comments_count + 1 }
            : p
        )
      );
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderPost = ({ item }: { item: CommunityPost }) => (
    <Card style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <Avatar
          source={item.author_profile_picture}
          name={item.author_full_name || item.author_username}
          size="md"
        />
        <View style={styles.postAuthorInfo}>
          <View style={styles.authorRow}>
            <Text style={styles.authorName}>
              {item.author_full_name || item.author_username}
            </Text>
            <Badge
              text={item.author_user_type}
              variant={item.author_user_type === 'client' ? 'emerald' : 'default'}
              size="sm"
            />
          </View>
          <Text style={styles.postTime}>{formatDate(item.created_at)}</Text>
        </View>
        {item.author_id === user?.id && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => handleDeletePost(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Post Content */}
      <Text style={styles.postContent}>{item.content}</Text>

      {/* Post Image */}
      {item.image_url && (
        <Image
          source={{ uri: getFileUrl(item.image_url) }}
          style={styles.postImage}
          contentFit="cover"
        />
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLikePost(item)}
        >
          <Ionicons
            name={item.is_liked_by_me ? 'heart' : 'heart-outline'}
            size={22}
            color={item.is_liked_by_me ? Colors.error : Colors.textSecondary}
          />
          <Text
            style={[
              styles.actionText,
              item.is_liked_by_me && { color: Colors.error },
            ]}
          >
            {item.likes_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openComments(item)}
        >
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={Colors.textSecondary}
          />
          <Text style={styles.actionText}>{item.comments_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderComment = ({ item }: { item: PostComment }) => (
    <View style={styles.commentItem}>
      <Avatar
        source={item.author_profile_picture}
        name={item.author_full_name || item.author_username}
        size="sm"
      />
      <View style={styles.commentContent}>
        <View style={styles.commentBubble}>
          <Text style={styles.commentAuthor}>
            {item.author_full_name || item.author_username}
          </Text>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
        <Text style={styles.commentTime}>{formatDate(item.created_at)}</Text>
      </View>
    </View>
  );

  if (loading) {
    return <Loading fullScreen text="Loading community..." />;
  }

  return (
    <View style={styles.container}>
      {/* New Post Button */}
      <TouchableOpacity
        style={styles.newPostButton}
        onPress={() => setShowNewPostModal(true)}
      >
        <Avatar
          source={user?.profile_picture}
          name={user?.full_name || user?.username}
          size="sm"
        />
        <Text style={styles.newPostPlaceholder}>What's on your mind?</Text>
        <Ionicons name="create-outline" size={24} color={Colors.primary} />
      </TouchableOpacity>

      {/* Posts List */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPost}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="globe-outline"
            title="No Posts Yet"
            description="Be the first to share something with the community!"
            actionLabel="Create Post"
            onAction={() => setShowNewPostModal(true)}
          />
        }
      />

      {/* New Post Modal */}
      <Modal
        visible={showNewPostModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNewPostModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setShowNewPostModal(false);
                setSelectedImage(null);
                setNewPostContent('');
              }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Post</Text>
              <Button
                title="Post"
                onPress={handleCreatePost}
                loading={posting}
                size="sm"
                disabled={!newPostContent.trim() && !selectedImage}
              />
            </View>

            <View style={styles.newPostContent}>
              <Avatar
                source={user?.profile_picture}
                name={user?.full_name || user?.username}
                size="md"
              />
              <TextInput
                style={styles.postInput}
                value={newPostContent}
                onChangeText={setNewPostContent}
                placeholder="What's on your mind?"
                placeholderTextColor={Colors.textMuted}
                multiline
                autoFocus
                maxLength={500}
              />
            </View>

            {/* Selected Image Preview */}
            {selectedImage && (
              <View style={styles.selectedImageContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.selectedImage}
                  contentFit="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={removeSelectedImage}
                >
                  <Ionicons name="close-circle" size={28} color={Colors.error} />
                </TouchableOpacity>
              </View>
            )}

            {/* Image Picker Buttons */}
            <View style={styles.imagePickerRow}>
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                <Ionicons name="image" size={24} color={Colors.primary} />
                <Text style={styles.imagePickerText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imagePickerButton} onPress={takePhoto}>
                <Ionicons name="camera" size={24} color={Colors.primary} />
                <Text style={styles.imagePickerText}>Camera</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.charCount}>
              {newPostContent.length}/500
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={showCommentsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCommentsModal(false)}
      >
        <View style={styles.commentsModalContainer}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Comments</Text>
            <TouchableOpacity onPress={() => setShowCommentsModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {loadingComments ? (
            <Loading text="Loading comments..." />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderComment}
              contentContainerStyle={styles.commentsList}
              ListEmptyComponent={
                <View style={styles.emptyComments}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={48}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.emptyCommentsText}>No comments yet</Text>
                  <Text style={styles.emptyCommentsSubtext}>
                    Be the first to comment!
                  </Text>
                </View>
              }
            />
          )}

          {/* Comment Input */}
          <View style={styles.commentInputContainer}>
            <Avatar
              source={user?.profile_picture}
              name={user?.full_name || user?.username}
              size="sm"
            />
            <TextInput
              style={styles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Write a comment..."
              placeholderTextColor={Colors.textMuted}
              maxLength={300}
            />
            <TouchableOpacity
              style={[
                styles.sendCommentButton,
                (!newComment.trim() || submittingComment) && styles.sendButtonDisabled,
              ]}
              onPress={handleAddComment}
              disabled={!newComment.trim() || submittingComment}
            >
              <Ionicons
                name="send"
                size={20}
                color={
                  newComment.trim() && !submittingComment
                    ? Colors.background
                    : Colors.textMuted
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  newPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    marginBottom: 0,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  newPostPlaceholder: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  list: {
    padding: Spacing.md,
  },
  postCard: {
    marginBottom: Spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  postAuthorInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  authorName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  postTime: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  moreButton: {
    padding: Spacing.xs,
  },
  postContent: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceLight,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xxl,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cancelText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  newPostContent: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  postInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    paddingHorizontal: Spacing.md,
  },
  selectedImageContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
  },
  removeImageButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: 14,
  },
  imagePickerRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.lg,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.lg,
  },
  imagePickerText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  commentsModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  commentsTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  commentsList: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  commentAuthor: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  commentText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 18,
  },
  commentTime: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyCommentsText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptyCommentsSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    maxHeight: 80,
  },
  sendCommentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
});
