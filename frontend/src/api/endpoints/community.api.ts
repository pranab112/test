import { apiClient } from '../client';

export interface PostAuthor {
  id: number;
  username: string;
  full_name?: string;
  profile_picture?: string;
  user_type: string;
}

export interface PostComment {
  id: number;
  post_id: number;
  content: string;
  author: PostAuthor;
  created_at: string;
}

export interface CommunityPost {
  id: number;
  content: string;
  image_url?: string;
  visibility: 'players' | 'clients';
  author: PostAuthor;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
  comments?: PostComment[];
}

export interface PaginatedPostsResponse {
  posts: CommunityPost[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface CreatePostRequest {
  content: string;
  image_url?: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface LikeResponse {
  message: string;
  likes_count: number;
}

export interface ImageUploadResponse {
  image_url: string;
}

export const communityApi = {
  // Get community posts (paginated)
  getPosts: async (page: number = 1, perPage: number = 20): Promise<PaginatedPostsResponse> => {
    const response = await apiClient.get('/community/posts', {
      params: { page, per_page: perPage }
    });
    return response as any;
  },

  // Get a single post with comments
  getPost: async (postId: number): Promise<CommunityPost> => {
    const response = await apiClient.get(`/community/posts/${postId}`);
    return response as any;
  },

  // Create a new post
  createPost: async (data: CreatePostRequest): Promise<CommunityPost> => {
    const response = await apiClient.post('/community/posts', data);
    return response as any;
  },

  // Update a post
  updatePost: async (postId: number, content: string): Promise<CommunityPost> => {
    const response = await apiClient.put(`/community/posts/${postId}`, { content });
    return response as any;
  },

  // Delete a post
  deletePost: async (postId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/community/posts/${postId}`);
    return response as any;
  },

  // Upload an image for a post
  uploadImage: async (file: File): Promise<ImageUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/community/posts/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response as any;
  },

  // Like a post
  likePost: async (postId: number): Promise<LikeResponse> => {
    const response = await apiClient.post(`/community/posts/${postId}/like`);
    return response as any;
  },

  // Unlike a post
  unlikePost: async (postId: number): Promise<LikeResponse> => {
    const response = await apiClient.delete(`/community/posts/${postId}/like`);
    return response as any;
  },

  // Add a comment to a post
  addComment: async (postId: number, data: CreateCommentRequest): Promise<PostComment> => {
    const response = await apiClient.post(`/community/posts/${postId}/comments`, data);
    return response as any;
  },

  // Delete a comment
  deleteComment: async (postId: number, commentId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/community/posts/${postId}/comments/${commentId}`);
    return response as any;
  },

  // Get current user's posts
  getMyPosts: async (page: number = 1, perPage: number = 20): Promise<PaginatedPostsResponse> => {
    const response = await apiClient.get('/community/my-posts', {
      params: { page, per_page: perPage }
    });
    return response as any;
  },
};
