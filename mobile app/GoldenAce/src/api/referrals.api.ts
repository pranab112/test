import { api } from '../services/api';

export interface ReferralCode {
  code: string;
  created_at: string;
}

export interface ReferralStats {
  total_referrals: number;
  completed_referrals: number;
  pending_referrals: number;
  total_credits_earned: number;
}

export interface Referral {
  id: number;
  referred_user_id: number;
  referred_username: string;
  referred_full_name?: string;
  referred_profile_picture?: string;
  status: 'pending' | 'completed' | 'expired';
  bonus_amount: number;
  created_at: string;
  completed_at?: string;
}

const REFERRAL_ENDPOINTS = {
  MY_CODE: '/referrals/my-code',
  GENERATE_CODE: '/referrals/generate-code',
  STATS: '/referrals/stats',
  LIST: '/referrals/list',
};

export const referralsApi = {
  // Get my referral code
  getMyCode: async (): Promise<ReferralCode> => {
    try {
      const response = await api.get(REFERRAL_ENDPOINTS.MY_CODE);
      return response as unknown as ReferralCode;
    } catch (error) {
      throw error;
    }
  },

  // Generate new referral code
  generateCode: async (): Promise<ReferralCode> => {
    try {
      const response = await api.post(REFERRAL_ENDPOINTS.GENERATE_CODE);
      return response as unknown as ReferralCode;
    } catch (error) {
      throw error;
    }
  },

  // Get referral statistics
  getStats: async (): Promise<ReferralStats> => {
    try {
      const response = await api.get(REFERRAL_ENDPOINTS.STATS);
      return response as unknown as ReferralStats;
    } catch (error) {
      throw error;
    }
  },

  // Get referral list
  getList: async (skip = 0, limit = 50): Promise<Referral[]> => {
    try {
      const response = await api.get(REFERRAL_ENDPOINTS.LIST, {
        params: { skip, limit },
      });
      return response as unknown as Referral[];
    } catch (error) {
      throw error;
    }
  },
};
