import { apiClient } from '../client';

// Types
export interface ReferralCodeResponse {
  referral_code: string;
  referral_link: string;
}

export interface ReferralStats {
  total_referrals: number;
  completed_referrals: number;
  pending_referrals: number;
  total_credits_earned: number;
  referral_code: string | null;
}

export interface ReferredUser {
  id: number;
  username: string;
  full_name: string | null;
  status: 'pending' | 'completed' | 'expired';
  created_at: string;
  completed_at: string | null;
  bonus_amount: number;
}

export interface ReferralListResponse {
  referrals: ReferredUser[];
  total_count: number;
  total_credits_earned: number;
}

export interface ReferralBonusInfo {
  bonus_per_referral: number;
  description: string;
  how_it_works: string[];
}

export const referralsApi = {
  // Get or generate the current user's referral code
  getMyCode: async (): Promise<ReferralCodeResponse> => {
    const response = await apiClient.get('/referrals/my-code');
    return response as any;
  },

  // Regenerate a new referral code
  regenerateCode: async (): Promise<ReferralCodeResponse> => {
    const response = await apiClient.post('/referrals/generate-code');
    return response as any;
  },

  // Get referral statistics
  getStats: async (): Promise<ReferralStats> => {
    const response = await apiClient.get('/referrals/stats');
    return response as any;
  },

  // Get list of all referrals made by the user
  getList: async (): Promise<ReferralListResponse> => {
    const response = await apiClient.get('/referrals/list');
    return response as any;
  },

  // Get information about the referral bonus program (public)
  getBonusInfo: async (): Promise<ReferralBonusInfo> => {
    const response = await apiClient.get('/referrals/bonus-info');
    return response as any;
  },
};
