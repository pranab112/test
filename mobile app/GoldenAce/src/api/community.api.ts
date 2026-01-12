import { api } from '../services/api';

export interface CommunityPost {
  id: number;
  content: string;
  image_url?: string;
  author_id: number;
  author_username: string;
  author_full_name?: string;
  author_profile_picture?: string;
  author_user_type: string;
  likes_count: number;
  comments_count: number;
  is_liked_by_me: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostComment {
  id: number;
  content: string;
  post_id: number;
  author_id: number;
  author_username: string;
  author_full_name?: string;
  author_profile_picture?: string;
  created_at: string;
}

export interface CreatePostData {
  content: string;
  image_url?: string;
}

export interface CreateCommentData {
  content: string;
}

const COMMUNITY_ENDPOINTS = {
  POSTS: '/community/posts',
  POST: (id: number) => `/community/posts/${id}`,
  LIKE: (id: number) => `/community/posts/${id}/like`,
  UNLIKE: (id: number) => `/community/posts/${id}/unlike`,
  COMMENTS: (id: number) => `/community/posts/${id}/comments`,
};

export const communityApi = {
  // Get all posts
  getPosts: async (skip = 0, limit = 20): Promise<CommunityPost[]> => {
    const response = await api.get(COMMUNITY_ENDPOINTS.POSTS, {
      params: { skip, limit },
    });
    return response as unknown as CommunityPost[];
  },

  // Get single post
  getPost: async (postId: number): Promise<CommunityPost> => {
    const response = await api.get(COMMUNITY_ENDPOINTS.POST(postId));
    return response as unknown as CommunityPost;
  },

  // Create post
  createPost: async (data: CreatePostData): Promise<CommunityPost> => {
    const response = await api.post(COMMUNITY_ENDPOINTS.POSTS, data);
    return response as unknown as CommunityPost;
  },

  // Delete post
  deletePost: async (postId: number): Promise<void> => {
    await api.delete(COMMUNITY_ENDPOINTS.POST(postId));
  },

  // Like post
  likePost: async (postId: number): Promise<{ message: string }> => {
    const response = await api.post(COMMUNITY_ENDPOINTS.LIKE(postId));
    return response as unknown as { message: string };
  },

  // Unlike post
  unlikePost: async (postId: number): Promise<{ message: string }> => {
    const response = await api.post(COMMUNITY_ENDPOINTS.UNLIKE(postId));
    return response as unknown as { message: string };
  },

  // Get comments for a post
  getComments: async (postId: number): Promise<PostComment[]> => {
    const response = await api.get(COMMUNITY_ENDPOINTS.COMMENTS(postId));
    return response as unknown as PostComment[];
  },

  // Add comment to a post
  addComment: async (postId: number, data: CreateCommentData): Promise<PostComment> => {
    const response = await api.post(COMMUNITY_ENDPOINTS.COMMENTS(postId), data);
    return response as unknown as PostComment;
  },
};
