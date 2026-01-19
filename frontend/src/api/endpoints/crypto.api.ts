import { apiClient } from '../client';

// Types
export interface CryptoWallet {
  id: number;
  crypto_type: string;
  network: string | null;
  wallet_address: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateWalletRequest {
  crypto_type: string;
  network?: string;
  wallet_address: string;
  is_active?: boolean;
}

export interface UpdateWalletRequest {
  crypto_type?: string;
  network?: string;
  wallet_address?: string;
  is_active?: boolean;
}

export interface PurchaseClient {
  id: number;
  username: string;
  full_name: string | null;
}

export interface CreditPurchase {
  id: number;
  reference_code: string;
  client: PurchaseClient | null;
  crypto_type: string;
  network: string;
  crypto_amount: string;
  usd_amount: number;
  credits_amount: number;
  wallet_address: string;
  tx_hash: string | null;
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface ConfirmPurchaseRequest {
  action: 'confirm' | 'reject';
  admin_notes?: string;
}

// API Functions
export const cryptoApi = {
  // Wallet Management
  getWallets: async (): Promise<CryptoWallet[]> => {
    const response = await apiClient.get('/crypto/admin/wallets');
    return response.data;
  },

  createWallet: async (data: CreateWalletRequest): Promise<CryptoWallet> => {
    const response = await apiClient.post('/crypto/admin/wallets', data);
    return response.data;
  },

  updateWallet: async (walletId: number, data: UpdateWalletRequest): Promise<CryptoWallet> => {
    const response = await apiClient.put(`/crypto/admin/wallets/${walletId}`, data);
    return response.data;
  },

  deleteWallet: async (walletId: number): Promise<void> => {
    await apiClient.delete(`/crypto/admin/wallets/${walletId}`);
  },

  // Purchase Management
  getPurchases: async (status?: string): Promise<CreditPurchase[]> => {
    const params = status ? { status_filter: status } : {};
    const response = await apiClient.get('/crypto/admin/purchases', { params });
    return response.data;
  },

  confirmPurchase: async (purchaseId: number, data: ConfirmPurchaseRequest): Promise<{ message: string; new_balance?: number }> => {
    const response = await apiClient.post(`/crypto/confirm/${purchaseId}`, data);
    return response.data;
  },
};
