import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { API_CONFIG } from '../config/api.config';

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
  imageUri?: string;
}

export interface CreateCommentData {
  content: string;
}

const COMMUNITY_ENDPOINTS = {
  POSTS: '/community/posts',
  UPLOAD_IMAGE: '/community/posts/upload-image',
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
      let image_url: string | undefined;

      // If there's an image, upload it first
      if (data.imageUri) {
        image_url = await communityApi.uploadImage(data.imageUri);
      }

      // Create the post with content and optional image_url
      const response = await api.post(COMMUNITY_ENDPOINTS.POSTS, {
        content: data.content,
        image_url,
      });
      return response as unknown as CommunityPost;
    } catch (error) {
      throw error;
    }
  },

  // Create post with image
  createPostWithImage: async (content: string, imageUri: string): Promise<CommunityPost> => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('content', content);

      // Get file extension and create file object
      const uriParts = imageUri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      const fileName = `post_image_${Date.now()}.${fileType}`;

      formData.append('image', {
        uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
        name: fileName,
        type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
      } as any);

      const response = await fetch(`${API_CONFIG.BASE_URL}${COMMUNITY_ENDPOINTS.POSTS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - let fetch set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { detail: errorData.detail || 'Failed to create post' };
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating post with image:', error);
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

  // Upload image
  uploadImage: async (imageUri: string): Promise<string> => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      const uriParts = imageUri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      const fileName = `image_${Date.now()}.${fileType}`;

      formData.append('image', {
        uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
        name: fileName,
        type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
      } as any);

      const response = await fetch(`${API_CONFIG.BASE_URL}${COMMUNITY_ENDPOINTS.UPLOAD_IMAGE}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { detail: errorData.detail || 'Failed to upload image' };
      }

      const result = await response.json();
      return result.image_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },
};
