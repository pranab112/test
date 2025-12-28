import { apiClient } from '../client';

export interface Promotion {
  id: number;
  client_id: number;
  title: string;
  description: string;
  promo_type: string;
  bonus_amount?: number;
  bonus_percentage?: number;
  max_claims: number;
  current_claims: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  image_url?: string;
  created_at: string;
  client?: {
    id: number;
    username: string;
    full_name: string;
  };
}

export interface CreatePromotionRequest {
  title: string;
  description: string;
  promo_type: string;
  bonus_amount?: number;
  bonus_percentage?: number;
  max_claims: number;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  image_url?: string;
}

export interface PromotionClaim {
  id: number;
  promotion_id: number;
  player_id: number;
  claimed_at: string;
  is_used: boolean;
  used_at?: string;
  player?: {
    id: number;
    username: string;
    full_name: string;
  };
}

export const promotionsApi = {
  // Client endpoints
  createPromotion: async (data: CreatePromotionRequest): Promise<Promotion> => {
    const response = await apiClient.post('/promotions/', data);
    return response as any;
  },

  getMyPromotions: async (): Promise<Promotion[]> => {
    const response = await apiClient.get('/promotions/my-promotions');
    return response as any;
  },

  updatePromotion: async (id: number, data: Partial<CreatePromotionRequest>): Promise<Promotion> => {
    const response = await apiClient.put(`/promotions/${id}`, data);
    return response as any;
  },

  deletePromotion: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/promotions/${id}`);
    return response as any;
  },

  getPromotionClaims: async (promotionId: number): Promise<PromotionClaim[]> => {
    const response = await apiClient.get(`/promotions/${promotionId}/claims`);
    return response as any;
  },

  // Player endpoints
  getAvailablePromotions: async (): Promise<Promotion[]> => {
    const response = await apiClient.get('/promotions/available');
    return response as any;
  },

  claimPromotion: async (promotionId: number): Promise<{ message: string; claim: PromotionClaim }> => {
    const response = await apiClient.post(`/promotions/${promotionId}/claim`);
    return response as any;
  },

  getMyClaimedPromotions: async (): Promise<PromotionClaim[]> => {
    const response = await apiClient.get('/promotions/my-claims');
    return response as any;
  },

  usePromotionClaim: async (claimId: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/promotions/claims/${claimId}/use`);
    return response as any;
  },
};