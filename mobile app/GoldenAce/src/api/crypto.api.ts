import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';
import type {
  CryptoWallet,
  CreditRate,
  CryptoPurchase,
  CreatePurchaseRequest,
  CryptoType,
} from '../types';

interface CryptoRatesResponse {
  rates: CreditRate;
  crypto_prices: Record<CryptoType, number>; // Current USD price per coin
}

export const cryptoApi = {
  // Get admin's crypto wallet addresses
  getWallets: async (): Promise<CryptoWallet[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.CRYPTO.WALLETS);
      return response as unknown as CryptoWallet[];
    } catch (error) {
      throw error;
    }
  },

  // Get current credit rates and crypto prices
  getRates: async (): Promise<CryptoRatesResponse> => {
    try {
      const response = await api.get(API_ENDPOINTS.CRYPTO.RATES);
      return response as unknown as CryptoRatesResponse;
    } catch (error) {
      throw error;
    }
  },

  // Create a new purchase request
  createPurchase: async (data: CreatePurchaseRequest): Promise<CryptoPurchase> => {
    try {
      const response = await api.post(API_ENDPOINTS.CRYPTO.PURCHASE, data);
      return response as unknown as CryptoPurchase;
    } catch (error) {
      throw error;
    }
  },

  // Get client's purchase history
  getMyPurchases: async (): Promise<CryptoPurchase[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.CRYPTO.MY_PURCHASES);
      return response as unknown as CryptoPurchase[];
    } catch (error) {
      throw error;
    }
  },

  // Get a specific purchase by ID
  getPurchase: async (purchaseId: number): Promise<CryptoPurchase> => {
    try {
      const response = await api.get(`${API_ENDPOINTS.CRYPTO.PURCHASE}/${purchaseId}`);
      return response as unknown as CryptoPurchase;
    } catch (error) {
      throw error;
    }
  },

  // Update purchase with transaction hash (client submits after payment)
  submitTxHash: async (purchaseId: number, txHash: string): Promise<CryptoPurchase> => {
    try {
      const response = await api.put(`${API_ENDPOINTS.CRYPTO.PURCHASE}/${purchaseId}/tx-hash`, {
        tx_hash: txHash,
      });
      return response as unknown as CryptoPurchase;
    } catch (error) {
      throw error;
    }
  },

  // Cancel a pending purchase
  cancelPurchase: async (purchaseId: number): Promise<void> => {
    try {
      await api.delete(`${API_ENDPOINTS.CRYPTO.PURCHASE}/${purchaseId}`);
    } catch (error) {
      throw error;
    }
  },
};
