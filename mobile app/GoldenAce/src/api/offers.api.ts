import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';
import type { PlatformOffer, OfferClaim, OfferClaimStatus } from '../types';

// Credit transfer types
export interface CreditTransferRequest {
  client_id: number;
  amount: number; // Amount in credits (100 credits = $1)
}

export interface CreditTransferResponse {
  message: string;
  credits_transferred: number;
  dollar_value: number;
  player_new_balance: number;
  client_new_balance: number;
  from_player: string;
  to_client: string;
}

export interface BalanceResponse {
  credits: number;
  dollar_value: number;
  rate: string;
}

export const offersApi = {
  // ============= PLAYER ENDPOINTS =============

  // Get available offers for player
  getAvailableOffers: async (): Promise<PlatformOffer[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.OFFERS.AVAILABLE);
      return response as unknown as PlatformOffer[];
    } catch (error) {
      throw error;
    }
  },

  // Get player's claims
  getMyClaims: async (): Promise<OfferClaim[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.OFFERS.MY_CLAIMS);
      return response as unknown as OfferClaim[];
    } catch (error) {
      throw error;
    }
  },

  // Claim an offer
  claimOffer: async (data: {
    offer_id: number;
    client_id: number;
    verification_data?: string;
  }): Promise<OfferClaim> => {
    try {
      const response = await api.post(API_ENDPOINTS.OFFERS.CLAIM, data);
      return response as unknown as OfferClaim;
    } catch (error) {
      throw error;
    }
  },

  // Get player's credit balance
  getMyBalance: async (): Promise<BalanceResponse> => {
    try {
      const response = await api.get('/offers/my-balance');
      return response as unknown as BalanceResponse;
    } catch (error) {
      throw error;
    }
  },

  // Transfer credits from player to client (one-way)
  transferCredits: async (data: CreditTransferRequest): Promise<CreditTransferResponse> => {
    try {
      const response = await api.post('/offers/transfer-credits', data);
      return response as unknown as CreditTransferResponse;
    } catch (error) {
      throw error;
    }
  },

  // Note: Client claim management is done via promotionsApi, not offersApi
  // Platform offers are admin-created and admin-approved
  // Client promotions are client-created and client-approved
};
