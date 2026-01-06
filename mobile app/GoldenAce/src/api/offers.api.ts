import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';
import type { PlatformOffer, OfferClaim, OfferClaimStatus } from '../types';

export const offersApi = {
  // ============= PLAYER ENDPOINTS =============

  // Get available offers for player
  getAvailableOffers: async (): Promise<PlatformOffer[]> => {
    const response = await api.get(API_ENDPOINTS.OFFERS.AVAILABLE);
    return response as unknown as PlatformOffer[];
  },

  // Get player's claims
  getMyClaims: async (): Promise<OfferClaim[]> => {
    const response = await api.get(API_ENDPOINTS.OFFERS.MY_CLAIMS);
    return response as unknown as OfferClaim[];
  },

  // Claim an offer
  claimOffer: async (data: {
    offer_id: number;
    client_id: number;
    verification_data?: string;
  }): Promise<OfferClaim> => {
    const response = await api.post(API_ENDPOINTS.OFFERS.CLAIM, data);
    return response as any;
  },

  // ============= CLIENT ENDPOINTS =============

  // Get pending claims for client
  getPendingClaimsForClient: async (): Promise<OfferClaim[]> => {
    const response = await api.get(API_ENDPOINTS.OFFERS.CLIENT_PENDING);
    return response as unknown as OfferClaim[];
  },

  // Process a claim (approve/reject)
  processClaim: async (
    claimId: number,
    data: { status: OfferClaimStatus }
  ): Promise<{ message: string }> => {
    const response = await api.put(`${API_ENDPOINTS.OFFERS.PROCESS_CLAIM}/${claimId}`, data);
    return response as any;
  },

  // Get all claims for client
  getAllClaimsForClient: async (): Promise<OfferClaim[]> => {
    const response = await api.get(API_ENDPOINTS.OFFERS.CLIENT_ALL);
    return response as unknown as OfferClaim[];
  },
};
