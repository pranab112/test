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

  // Upload image for a post
  uploadImage: async (imageUri: string): Promise<string> => {
    try {
      const formData = new FormData();

      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      } as unknown as Blob);

      // Increase timeout for image uploads
      const response = await api.post(COMMUNITY_ENDPOINTS.UPLOAD_IMAGE, formData, {
        timeout: 60000, // 60 seconds for image upload
      });
      return (response as unknown as { image_url: string }).image_url;
    } catch (error) {
      throw error;
    }
  },

  // Create post (with optional image)
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
