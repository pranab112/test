import { apiClient } from '../client';

export interface Review {
  id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  title?: string;
  comment: string;
  created_at: string;
  updated_at?: string;
  reviewer?: {
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
    user_type: string;
  };
  reviewee?: {
    id: number;
    username: string;
    full_name: string;
    profile_picture?: string;
    user_type: string;
  };
}

export interface CreateReviewRequest {
  reviewee_id: number;
  rating: number;
  title?: string;
  comment: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  comment?: string;
}

export interface ReviewListResponse {
  reviews: Review[];
  total_count: number;
  average_rating: number | null;
}

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export const reviewsApi = {
  // Create a review
  createReview: async (data: CreateReviewRequest): Promise<Review> => {
    const response = await apiClient.post('/reviews/', data);
    return response as any;
  },

  // Get my reviews (received)
  getMyReviews: async (skip = 0, limit = 50): Promise<ReviewListResponse> => {
    const response = await apiClient.get('/reviews/my-reviews', {
      params: { skip, limit },
    });
    return response as any;
  },

  // Get reviews I've given
  getGivenReviews: async (skip = 0, limit = 50): Promise<ReviewListResponse> => {
    const response = await apiClient.get('/reviews/given', {
      params: { skip, limit },
    });
    return response as any;
  },

  // Get user reviews
  getUserReviews: async (userId: number, skip = 0, limit = 50): Promise<ReviewListResponse> => {
    const response = await apiClient.get(`/reviews/user/${userId}`, {
      params: { skip, limit },
    });
    return response as any;
  },

  // Update review
  updateReview: async (reviewId: number, data: UpdateReviewRequest): Promise<Review> => {
    const response = await apiClient.put(`/reviews/${reviewId}`, data);
    return response as any;
  },

  // Delete review
  deleteReview: async (reviewId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/reviews/${reviewId}`);
    return response as any;
  },

  // Get review stats for a user
  getUserReviewStats: async (userId: number): Promise<ReviewStats> => {
    const response = await apiClient.get(`/reviews/stats/${userId}`);
    return response as any;
  },

  // Check if can review user
  canReviewUser: async (userId: number): Promise<{ can_review: boolean; reason?: string; existing_review_id?: number }> => {
    const response = await apiClient.get(`/reviews/can-review/${userId}`);
    return response as any;
  },
};