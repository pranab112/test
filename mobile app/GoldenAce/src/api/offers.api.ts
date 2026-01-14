import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';
import type { PlatformOffer, OfferClaim, OfferClaimStatus } from '../types';

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

  // Note: Client claim management is done via promotionsApi, not offersApi
  // Platform offers are admin-created and admin-approved
  // Client promotions are client-created and client-approved
};
