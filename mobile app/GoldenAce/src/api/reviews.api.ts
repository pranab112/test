import { api } from '../services/api';
import type { Review, ReviewStats, ReviewCreate } from '../types';

interface ReviewListResponse {
  reviews: Review[];
  total_count: number;
  average_rating: number | null;
}

export const reviewsApi = {
  // Create a review for a user
  createReview: async (data: ReviewCreate): Promise<Review> => {
    try {
      const response = await api.post('/reviews/', data);
      return response as unknown as Review;
    } catch (error) {
      throw error;
    }
  },

  // Get reviews for a specific user
  getUserReviews: async (userId: number): Promise<ReviewListResponse> => {
    try {
      const response = await api.get(`/reviews/user/${userId}`);
      return response as unknown as ReviewListResponse;
    } catch (error) {
      throw error;
    }
  },

  // Get reviews I've received
  getMyReviews: async (): Promise<Review[]> => {
    try {
      const response = await api.get('/reviews/my-reviews');
      return response as unknown as Review[];
    } catch (error) {
      throw error;
    }
  },

  // Get reviews I've given
  getGivenReviews: async (): Promise<Review[]> => {
    try {
      const response = await api.get('/reviews/given');
      return response as unknown as Review[];
    } catch (error) {
      throw error;
    }
  },

  // Update a review
  updateReview: async (
    reviewId: number,
    data: Partial<ReviewCreate>
  ): Promise<Review> => {
    try {
      const response = await api.put(`/reviews/${reviewId}`, data);
      return response as unknown as Review;
    } catch (error) {
      throw error;
    }
  },

  // Delete a review
  deleteReview: async (reviewId: number): Promise<{ message: string }> => {
    try {
      const response = await api.delete(`/reviews/${reviewId}`);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Get review stats for a user
  getReviewStats: async (userId: number): Promise<ReviewStats> => {
    try {
      const response = await api.get(`/reviews/stats/${userId}`);
      return response as unknown as ReviewStats;
    } catch (error) {
      throw error;
    }
  },

  // Check if current user can review another user
  canReview: async (userId: number): Promise<{ can_review: boolean; reason?: string }> => {
    try {
      const response = await api.get(`/reviews/can-review/${userId}`);
      return response as unknown as { can_review: boolean; reason?: string };
    } catch (error) {
      throw error;
    }
  },
};
