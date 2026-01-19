import { api } from '../services/api';

export interface PostAuthor {
  id: number;
  username: string;
  full_name?: string;
  profile_picture?: string;
  user_type: string;
}

export interface CommunityPost {
  id: number;
  content: string;
  image_url?: string;
  visibility: string;
  author: PostAuthor;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_liked_by_me?: boolean; // Alias for is_liked (for backward compatibility)
  created_at: string;
  updated_at: string;
}

export interface PostComment {
  id: number;
  content: string;
  post_id: number;
  author: PostAuthor;
  created_at: string;
}

export interface CreatePostData {
  content: string;
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

interface PostsResponse {
  posts: CommunityPost[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export const communityApi = {
  // Get all posts
  getPosts: async (page = 1, perPage = 20): Promise<PostsResponse> => {
    try {
      const response = await api.get(COMMUNITY_ENDPOINTS.POSTS, {
        params: { page, per_page: perPage },
      });
      return response as unknown as PostsResponse;
    } catch (error) {
      throw error;
    }
  },

  // Get single post
  getPost: async (postId: number): Promise<CommunityPost> => {
    try {
      const response = await api.get(COMMUNITY_ENDPOINTS.POST(postId));
      return response as unknown as CommunityPost;
    } catch (error) {
      throw error;
    }
  },

  // Create post
  createPost: async (data: CreatePostData): Promise<CommunityPost> => {
    try {
      const response = await api.post(COMMUNITY_ENDPOINTS.POSTS, {
        content: data.content,
      });
      return response as unknown as CommunityPost;
    } catch (error) {
      throw error;
    }
  },

  // Delete post
  deletePost: async (postId: number): Promise<void> => {
    try {
      await api.delete(COMMUNITY_ENDPOINTS.POST(postId));
    } catch (error) {
      throw error;
    }
  },

  // Like post
  likePost: async (postId: number): Promise<{ message: string }> => {
    try {
      const response = await api.post(COMMUNITY_ENDPOINTS.LIKE(postId));
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Unlike post
  unlikePost: async (postId: number): Promise<{ message: string }> => {
    try {
      const response = await api.post(COMMUNITY_ENDPOINTS.UNLIKE(postId));
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Get comments for a post
  getComments: async (postId: number): Promise<PostComment[]> => {
    try {
      const response = await api.get(COMMUNITY_ENDPOINTS.COMMENTS(postId));
      return response as unknown as PostComment[];
    } catch (error) {
      throw error;
    }
  },

  // Add comment to a post
  addComment: async (postId: number, data: CreateCommentData): Promise<PostComment> => {
    try {
      const response = await api.post(COMMUNITY_ENDPOINTS.COMMENTS(postId), data);
      return response as unknown as PostComment;
    } catch (error) {
      throw error;
    }
  },

};
