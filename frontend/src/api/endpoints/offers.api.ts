import { apiClient } from '../client';

export type OfferType =
  | 'profile_completion'
  | 'first_deposit'
  | 'referral'
  | 'loyalty'
  | 'special_event';

export type OfferStatus = 'active' | 'inactive' | 'expired';
export type OfferClaimStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface PlatformOffer {
  id: number;
  title: string;
  description: string;
  offer_type: OfferType;
  bonus_amount: number;
  requirement_description?: string;
  max_claims?: number;
  max_claims_per_player: number;
  status: OfferStatus;
  start_date: string;
  end_date?: string;
  created_at: string;
  total_claims?: number;
}

export interface OfferClaim {
  id: number;
  offer_id: number;
  player_id: number;
  client_id: number;
  status: OfferClaimStatus;
  bonus_amount: number;
  verification_data?: string;
  claimed_at: string;
  processed_at?: string;
  offer_title?: string;
  client_name?: string;
  player_name?: string;
}

export interface CreateOfferRequest {
  title: string;
  description: string;
  offer_type: OfferType;
  bonus_amount: number;
  requirement_description?: string;
  max_claims?: number;
  max_claims_per_player?: number;
  end_date?: string;
}

export interface UpdateOfferRequest {
  title?: string;
  description?: string;
  offer_type?: OfferType;
  bonus_amount?: number;
  requirement_description?: string;
  max_claims?: number;
  max_claims_per_player?: number;
  status?: OfferStatus;
  end_date?: string;
}

export interface ClaimOfferRequest {
  offer_id: number;
  client_id?: number;  // Optional - player can claim without client
  verification_data?: string;
}

export interface CreditTransferRequest {
  client_id: number;
  amount: number;  // Amount in credits (100 credits = $1)
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

export interface ProcessClaimRequest {
  status: OfferClaimStatus;
}

export const offersApi = {
  // ============= ADMIN ENDPOINTS =============

  // Create a new platform offer (Admin only)
  createOffer: async (data: CreateOfferRequest): Promise<PlatformOffer> => {
    const response = await apiClient.post('/offers/admin/create', data);
    return response as any;
  },

  // Get all platform offers (Admin only)
  getAllOffersAdmin: async (includeInactive = true): Promise<PlatformOffer[]> => {
    const response = await apiClient.get('/offers/admin/all', {
      params: { include_inactive: includeInactive },
    });
    return response as any;
  },

  // Update a platform offer (Admin only)
  updateOffer: async (offerId: number, data: UpdateOfferRequest): Promise<PlatformOffer> => {
    const response = await apiClient.put(`/offers/admin/${offerId}`, data);
    return response as any;
  },

  // Delete/deactivate a platform offer (Admin only)
  deleteOffer: async (offerId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/offers/admin/${offerId}`);
    return response as any;
  },

  // Get all claims (Admin only)
  getAllClaimsAdmin: async (statusFilter?: OfferClaimStatus): Promise<OfferClaim[]> => {
    const params: any = {};
    if (statusFilter) {
      params.status_filter = statusFilter;
    }
    const response = await apiClient.get('/offers/admin/claims', { params });
    return response as any;
  },

  // Get pending claims for admin approval (Admin only)
  getPendingClaimsAdmin: async (): Promise<OfferClaim[]> => {
    const response = await apiClient.get('/offers/admin/pending-claims');
    return response as any;
  },

  // Process a claim - Admin approves/rejects (Admin only)
  processClaimAdmin: async (claimId: number, data: ProcessClaimRequest): Promise<{ message: string }> => {
    const response = await apiClient.put(`/offers/admin/process-claim/${claimId}`, data);
    return response as any;
  },

  // ============= PLAYER ENDPOINTS =============

  // Get available offers for player
  getAvailableOffers: async (): Promise<PlatformOffer[]> => {
    const response = await apiClient.get('/offers/available');
    return response as any;
  },

  // Get player's claims
  getMyClaims: async (): Promise<OfferClaim[]> => {
    const response = await apiClient.get('/offers/my-claims');
    return response as any;
  },

  // Claim an offer
  claimOffer: async (data: ClaimOfferRequest): Promise<OfferClaim> => {
    const response = await apiClient.post('/offers/claim', data);
    return response as any;
  },

  // Get player's credit balance
  getMyBalance: async (): Promise<BalanceResponse> => {
    const response = await apiClient.get('/offers/my-balance');
    return response as any;
  },

  // Transfer credits from player to client (one-way)
  transferCredits: async (data: CreditTransferRequest): Promise<CreditTransferResponse> => {
    const response = await apiClient.post('/offers/transfer-credits', data);
    return response as any;
  },

  // ============= CLIENT ENDPOINTS =============

  // Get pending claims for client
  getPendingClaimsForClient: async (): Promise<OfferClaim[]> => {
    const response = await apiClient.get('/offers/client/pending-claims');
    return response as any;
  },

  // Process a claim (approve/reject)
  processClaim: async (claimId: number, data: ProcessClaimRequest): Promise<{ message: string }> => {
    const response = await apiClient.put(`/offers/client/process-claim/${claimId}`, data);
    return response as any;
  },

  // Get all claims for client
  getAllClaimsForClient: async (): Promise<OfferClaim[]> => {
    const response = await apiClient.get('/offers/client/all-claims');
    return response as any;
  },
};
