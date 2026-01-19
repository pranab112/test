import { useState, useEffect } from 'react';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Modal } from './Modal';
import { communityApi, type CommunityPost, type PostComment } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { getFileUrl } from '@/config/api.config';
import toast from 'react-hot-toast';
import { MdSend, MdMoreVert, MdEdit, MdDelete, MdRefresh } from 'react-icons/md';
import { FaHeart, FaRegHeart, FaComment, FaRegComment } from 'react-icons/fa';

interface CommunityProps {
  userType: 'player' | 'client';
}

export function CommunitySection({ userType }: CommunityProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async (resetPage = true) => {
    if (resetPage) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentPage = resetPage ? 1 : page;
      const response = await communityApi.getPosts(currentPage, 20);

      if (resetPage) {
        setPosts(response.posts);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
      }

      setHasMore(response.has_more);
      if (!resetPage) {
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1);
      loadPosts(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast.error('Please add some content');
      return;
    }

    setSubmittingPost(true);
    try {
      const post = await communityApi.createPost({
        content: newPostContent.trim(),
      });

      setPosts(prev => [post, ...prev]);
      setNewPostContent('');
      toast.success('Post created!');
    } catch (error) {
      toast.error('Failed to create post');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleLikePost = async (postId: number, isLiked: boolean) => {
    try {
      if (isLiked) {
        await communityApi.unlikePost(postId);
      } else {
        await communityApi.likePost(postId);
      }

      // Update local state
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                is_liked: !isLiked,
                likes_count: isLiked ? post.likes_count - 1 : post.likes_count + 1,
              }
            : post
        )
      );

      // Also update selected post if viewing comments
      if (selectedPost?.id === postId) {
        setSelectedPost(prev =>
          prev
            ? {
                ...prev,
                is_liked: !isLiked,
                likes_count: isLiked ? prev.likes_count - 1 : prev.likes_count + 1,
              }
            : null
        );
      }
    } catch (error) {
      toast.error('Failed to update like');
    }
  };

  const handleViewComments = async (post: CommunityPost) => {
    try {
      const fullPost = await communityApi.getPost(post.id);
      setSelectedPost(fullPost);
      setShowComments(true);
    } catch (error) {
      toast.error('Failed to load comments');
    }
  };

  const handleAddComment = async () => {
    if (!selectedPost || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const comment = await communityApi.addComment(selectedPost.id, {
        content: newComment.trim(),
      });

      // Update selected post with new comment
      setSelectedPost(prev =>
        prev
          ? {
              ...prev,
              comments: [...(prev.comments || []), comment],
              comments_count: prev.comments_count + 1,
            }
          : null
      );

      // Update posts list
      setPosts(prev =>
        prev.map(post =>
          post.id === selectedPost.id
            ? { ...post, comments_count: post.comments_count + 1 }
            : post
        )
      );

      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!selectedPost) return;

    try {
      await communityApi.deleteComment(selectedPost.id, commentId);

      // Update selected post
      setSelectedPost(prev =>
        prev
          ? {
              ...prev,
              comments: prev.comments?.filter(c => c.id !== commentId) || [],
              comments_count: prev.comments_count - 1,
            }
          : null
      );

      // Update posts list
      setPosts(prev =>
        prev.map(post =>
          post.id === selectedPost.id
            ? { ...post, comments_count: post.comments_count - 1 }
            : post
        )
      );

      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const handleEditPost = (post: CommunityPost) => {
    setEditingPost(post);
    setEditContent(post.content);
  };

  const handleSaveEdit = async () => {
    if (!editingPost || !editContent.trim()) return;

    try {
      const updatedPost = await communityApi.updatePost(editingPost.id, editContent.trim());

      setPosts(prev =>
        prev.map(post => (post.id === editingPost.id ? updatedPost : post))
      );

      setEditingPost(null);
      setEditContent('');
      toast.success('Post updated');
    } catch (error) {
      toast.error('Failed to update post');
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await communityApi.deletePost(postId);
      setPosts(prev => prev.filter(post => post.id !== postId));
      toast.success('Post deleted');
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const formatTimeAgo = (dateString: string) => {
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
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-emerald-500">Loading community...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-emerald-500 mb-2">
            {userType === 'player' ? 'Player' : 'Client'} Community
          </h1>
          <p className="text-gray-400">
            Connect with other {userType === 'player' ? 'players' : 'clients'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadPosts()}
          className="bg-dark-300 hover:bg-dark-400 text-emerald-500 p-3 rounded-lg transition-colors"
          title="Refresh"
        >
          <MdRefresh size={20} />
        </button>
      </div>

      {/* Create Post */}
      <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-4">
        <div className="flex gap-3">
          <Avatar
            src={user?.profile_picture}
            name={user?.full_name || user?.username || 'User'}
            size="md"
          />
          <div className="flex-1">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-dark-300 border border-dark-400 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-emerald-500"
              rows={3}
            />

            {/* Actions */}
            <div className="flex items-center justify-between mt-3">
              <Button
                onClick={handleCreatePost}
                disabled={submittingPost || !newPostContent.trim()}
                loading={submittingPost}
                variant="primary"
              >
                <MdSend className="mr-1" />
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-8 text-center">
            <p className="text-gray-400">No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id || 0}
              onLike={() => handleLikePost(post.id, post.is_liked)}
              onComment={() => handleViewComments(post)}
              onEdit={() => handleEditPost(post)}
              onDelete={() => handleDeletePost(post.id)}
              formatTimeAgo={formatTimeAgo}
            />
          ))
        )}

        {/* Load More */}
        {hasMore && (
          <div className="text-center">
            <Button
              onClick={handleLoadMore}
              loading={loadingMore}
              variant="secondary"
            >
              Load More
            </Button>
          </div>
        )}
      </div>

      {/* Comments Modal */}
      <Modal
        isOpen={showComments}
        onClose={() => {
          setShowComments(false);
          setSelectedPost(null);
          setNewComment('');
        }}
        title="Comments"
        size="lg"
      >
        {selectedPost && (
          <div className="space-y-4">
            {/* Post Content */}
            <div className="bg-dark-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Avatar
                  src={selectedPost.author.profile_picture}
                  name={selectedPost.author.full_name || selectedPost.author.username}
                  size="sm"
                />
                <div className="flex-1">
                  <p className="font-medium text-white">
                    {selectedPost.author.full_name || selectedPost.author.username}
                  </p>
                  <p className="text-gray-400 text-sm">{formatTimeAgo(selectedPost.created_at)}</p>
                </div>
              </div>
              <p className="text-white mt-3">{selectedPost.content}</p>
              {selectedPost.image_url && (
                <img
                  src={getFileUrl(selectedPost.image_url)}
                  alt="Post"
                  className="mt-3 rounded-lg max-h-64 object-cover"
                />
              )}
            </div>

            {/* Comments List */}
            <div className="max-h-64 overflow-y-auto space-y-3">
              {selectedPost.comments?.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No comments yet</p>
              ) : (
                selectedPost.comments?.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    currentUserId={user?.id || 0}
                    onDelete={() => handleDeleteComment(comment.id)}
                    formatTimeAgo={formatTimeAgo}
                  />
                ))
              )}
            </div>

            {/* Add Comment */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button
                onClick={handleAddComment}
                disabled={submittingComment || !newComment.trim()}
                loading={submittingComment}
                variant="primary"
              >
                <MdSend />
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        isOpen={!!editingPost}
        onClose={() => {
          setEditingPost(null);
          setEditContent('');
        }}
        title="Edit Post"
      >
        {editingPost && (
          <div className="space-y-4">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-dark-300 border border-dark-400 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-emerald-500"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setEditingPost(null);
                  setEditContent('');
                }}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editContent.trim()}
                variant="primary"
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Post Card Component
function PostCard({
  post,
  currentUserId,
  onLike,
  onComment,
  onEdit,
  onDelete,
  formatTimeAgo,
}: {
  post: CommunityPost;
  currentUserId: number;
  onLike: () => void;
  onComment: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatTimeAgo: (date: string) => string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const isOwner = post.author.id === currentUserId;

  return (
    <div className="bg-dark-200 border-2 border-emerald-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar
            src={post.author.profile_picture}
            name={post.author.full_name || post.author.username}
            size="md"
          />
          <div>
            <p className="font-medium text-white">
              {post.author.full_name || post.author.username}
            </p>
            <p className="text-gray-400 text-sm">{formatTimeAgo(post.created_at)}</p>
          </div>
        </div>

        {isOwner && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-white p-1"
            >
              <MdMoreVert size={20} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 bg-dark-300 border border-dark-400 rounded-lg shadow-lg py-1 z-10">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onEdit();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-dark-400 w-full"
                >
                  <MdEdit size={16} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-dark-400 w-full"
                >
                  <MdDelete size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <p className="text-white mt-3 whitespace-pre-wrap">{post.content}</p>

      {/* Image */}
      {post.image_url && (
        <img
          src={getFileUrl(post.image_url)}
          alt="Post"
          className="mt-3 rounded-lg max-h-96 w-full object-cover"
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 mt-4 pt-3 border-t border-dark-400">
        <button
          type="button"
          onClick={onLike}
          className={`flex items-center gap-2 transition-colors ${
            post.is_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
          }`}
        >
          {post.is_liked ? <FaHeart size={18} /> : <FaRegHeart size={18} />}
          <span>{post.likes_count}</span>
        </button>

        <button
          type="button"
          onClick={onComment}
          className="flex items-center gap-2 text-gray-400 hover:text-emerald-500 transition-colors"
        >
          {post.comments_count > 0 ? <FaComment size={18} /> : <FaRegComment size={18} />}
          <span>{post.comments_count}</span>
        </button>
      </div>
    </div>
  );
}

// Comment Card Component
function CommentCard({
  comment,
  currentUserId,
  onDelete,
  formatTimeAgo,
}: {
  comment: PostComment;
  currentUserId: number;
  onDelete: () => void;
  formatTimeAgo: (date: string) => string;
}) {
  const isOwner = comment.author.id === currentUserId;

  return (
    <div className="bg-dark-400 rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Avatar
            src={comment.author.profile_picture}
            name={comment.author.full_name || comment.author.username}
            size="sm"
          />
          <div>
            <p className="font-medium text-white text-sm">
              {comment.author.full_name || comment.author.username}
            </p>
            <p className="text-gray-500 text-xs">{formatTimeAgo(comment.created_at)}</p>
          </div>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 p-1"
          >
            <MdDelete size={16} />
          </button>
        )}
      </div>
      <p className="text-gray-300 mt-2 text-sm">{comment.content}</p>
    </div>
  );
}
