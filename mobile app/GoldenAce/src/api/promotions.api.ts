import { api } from '../services/api';

// Types
export interface Promotion {
  id: number;
  client_id: number;
  title: string;
  description: string;
  promotion_type: 'gc_bonus';
  value: number;
  status: 'active' | 'expired' | 'depleted' | 'cancelled';
  start_date: string;
  end_date: string;
  claims_count: number;
  max_claims_per_player: number;
  total_budget?: number;
  used_budget: number;
  min_player_level: number;
  terms?: string;
  wagering_requirement: number;
  client_name?: string;
  client_company?: string;
  can_claim?: boolean;
  already_claimed?: boolean;
}

export interface PromotionClaim {
  id?: number;
  claim_id: number;
  promotion_id: number;
  promotion_title: string;
  promotion_type: string;
  player_id: number;
  player_username?: string;
  player_name?: string;
  player_level?: number;
  client_name?: string;
  client_company?: string;
  claimed_value: number;
  value?: number;
  status: 'pending_approval' | 'approved' | 'rejected' | 'claimed' | 'used' | 'expired';
  claimed_at: string;
  wagering_completed?: number;
  wagering_required?: number;
  message_id?: number;
}

export interface CreatePromotionData {
  title: string;
  description: string;
  promotion_type: 'gc_bonus';
  value: number;
  end_date: string;
  max_claims_per_player?: number;
  total_budget?: number;
  min_player_level?: number;
  terms?: string;
  wagering_requirement?: number;
}

export interface UpdatePromotionData {
  title?: string;
  description?: string;
  value?: number;
  end_date?: string;
  max_claims_per_player?: number;
  total_budget?: number;
  min_player_level?: number;
  terms?: string;
  wagering_requirement?: number;
}

const PROMOTIONS_ENDPOINTS = {
  // Player endpoints
  AVAILABLE: '/promotions/available',
  MY_CLAIMS: '/promotions/my-claims',
  CLAIM: '/promotions/claim',
  // Client endpoints
  CREATE: '/promotions/create',
  MY_PROMOTIONS: '/promotions/my-promotions',
  PENDING_APPROVALS: '/promotions/pending-approvals',
  UPDATE: '/promotions', // /{id}/update
  CANCEL: '/promotions', // /{id}/cancel
  APPROVE_CLAIM: '/promotions/approve-claim', // /{claim_id}
  REJECT_CLAIM: '/promotions/reject-claim', // /{claim_id}
};

export const promotionsApi = {
  // ============= PLAYER ENDPOINTS =============

  // Get available promotions for player
  getAvailablePromotions: async (): Promise<Promotion[]> => {
    try {
      const response = await api.get(PROMOTIONS_ENDPOINTS.AVAILABLE);
      return response as unknown as Promotion[];
    } catch (error) {
      throw error;
    }
  },

  // Get player's claimed promotions
  getMyClaims: async (): Promise<PromotionClaim[]> => {
    try {
      const response = await api.get(PROMOTIONS_ENDPOINTS.MY_CLAIMS);
      return response as unknown as PromotionClaim[];
    } catch (error) {
      throw error;
    }
  },

  // Claim a promotion
  claimPromotion: async (promotionId: number): Promise<{
    success: boolean;
    message: string;
    claim_id?: number;
    status?: string;
  }> => {
    try {
      const response = await api.post(PROMOTIONS_ENDPOINTS.CLAIM, {
        promotion_id: promotionId,
      });
      return response as unknown as {
        success: boolean;
        message: string;
        claim_id?: number;
        status?: string;
      };
    } catch (error) {
      throw error;
    }
  },

  // ============= CLIENT ENDPOINTS =============

  // Create a new promotion
  createPromotion: async (data: CreatePromotionData): Promise<Promotion> => {
    try {
      const response = await api.post(PROMOTIONS_ENDPOINTS.CREATE, data);
      return response as unknown as Promotion;
    } catch (error) {
      throw error;
    }
  },

  // Get client's promotions
  getMyPromotions: async (): Promise<Promotion[]> => {
    try {
      const response = await api.get(PROMOTIONS_ENDPOINTS.MY_PROMOTIONS);
      return response as unknown as Promotion[];
    } catch (error) {
      throw error;
    }
  },

  // Get pending approval claims
  getPendingApprovals: async (): Promise<PromotionClaim[]> => {
    try {
      const response = await api.get(PROMOTIONS_ENDPOINTS.PENDING_APPROVALS);
      return response as unknown as PromotionClaim[];
    } catch (error) {
      throw error;
    }
  },

  // Update a promotion
  updatePromotion: async (promotionId: number, data: UpdatePromotionData): Promise<Promotion> => {
    try {
      const response = await api.put(`${PROMOTIONS_ENDPOINTS.UPDATE}/${promotionId}/update`, data);
      return response as unknown as Promotion;
    } catch (error) {
      throw error;
    }
  },

  // Cancel a promotion
  cancelPromotion: async (promotionId: number): Promise<{ message: string }> => {
    try {
      const response = await api.put(`${PROMOTIONS_ENDPOINTS.CANCEL}/${promotionId}/cancel`);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Approve a claim
  approveClaim: async (claimId: number): Promise<{
    success: boolean;
    message: string;
    claim_id: number;
    status: string;
  }> => {
    try {
      const response = await api.post(`${PROMOTIONS_ENDPOINTS.APPROVE_CLAIM}/${claimId}`);
      return response as unknown as {
        success: boolean;
        message: string;
        claim_id: number;
        status: string;
      };
    } catch (error) {
      throw error;
    }
  },

  // Reject a claim
  rejectClaim: async (claimId: number, reason?: string): Promise<{
    success: boolean;
    message: string;
    claim_id: number;
    status: string;
  }> => {
    try {
      const response = await api.post(`${PROMOTIONS_ENDPOINTS.REJECT_CLAIM}/${claimId}`, {
        reason: reason || '',
      });
      return response as unknown as {
        success: boolean;
        message: string;
        claim_id: number;
        status: string;
      };
    } catch (error) {
      throw error;
    }
  },
};
