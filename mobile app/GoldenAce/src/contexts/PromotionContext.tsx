import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { promotionsApi, Promotion } from '../api/promotions.api';
import { useAuth } from './AuthContext';

const LAST_VIEWED_PROMOS_KEY = 'last_viewed_promotions_timestamp';
const SEEN_PROMO_IDS_KEY = 'seen_promotion_ids';

interface PromotionContextType {
  newPromotionsCount: number;
  refreshPromotionsCount: () => Promise<void>;
  markPromotionsAsViewed: () => Promise<void>;
  resetCount: () => void;
}

const PromotionContext = createContext<PromotionContextType | undefined>(undefined);

// Storage helper for web/native
const storage = Platform.OS === 'web' ? {
  getItem: (key: string) => {
    if (typeof localStorage !== 'undefined') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return Promise.resolve(null);
  },
  setItem: (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
    return Promise.resolve();
  },
} : {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
};

export function PromotionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [newPromotionsCount, setNewPromotionsCount] = useState(0);
  const isPlayerRef = useRef(false);

  // Check if user is a player (only players see promotions badge)
  useEffect(() => {
    isPlayerRef.current = user?.user_type === 'player';
  }, [user]);

  const refreshPromotionsCount = useCallback(async () => {
    if (!user || user.user_type !== 'player') {
      setNewPromotionsCount(0);
      return;
    }

    try {
      // Get the list of seen promotion IDs
      const seenIdsJson = await storage.getItem(SEEN_PROMO_IDS_KEY);
      const seenIds: number[] = seenIdsJson ? JSON.parse(seenIdsJson) : [];

      // Get available promotions
      const promotions = await promotionsApi.getAvailablePromotions();

      // Count promotions that haven't been seen yet
      const newCount = promotions.filter(
        (promo) => !seenIds.includes(promo.id) && promo.can_claim && !promo.already_claimed
      ).length;

      setNewPromotionsCount(newCount);
    } catch (error) {
      console.error('Error fetching promotions count:', error);
    }
  }, [user]);

  const markPromotionsAsViewed = useCallback(async () => {
    if (!user || user.user_type !== 'player') {
      return;
    }

    try {
      // Get all current promotion IDs
      const promotions = await promotionsApi.getAvailablePromotions();
      const allIds = promotions.map((p) => p.id);

      // Store all current IDs as seen
      await storage.setItem(SEEN_PROMO_IDS_KEY, JSON.stringify(allIds));

      // Also update timestamp
      await storage.setItem(LAST_VIEWED_PROMOS_KEY, new Date().toISOString());

      // Reset count
      setNewPromotionsCount(0);
    } catch (error) {
      console.error('Error marking promotions as viewed:', error);
    }
  }, [user]);

  const resetCount = useCallback(() => {
    setNewPromotionsCount(0);
  }, []);

  // Fetch count on mount and when user changes
  useEffect(() => {
    refreshPromotionsCount();
  }, [refreshPromotionsCount]);

  // Refresh count periodically (every 60 seconds)
  useEffect(() => {
    if (!user || user.user_type !== 'player') return;

    const interval = setInterval(() => {
      refreshPromotionsCount();
    }, 60000);

    return () => clearInterval(interval);
  }, [user, refreshPromotionsCount]);

  return (
    <PromotionContext.Provider
      value={{
        newPromotionsCount,
        refreshPromotionsCount,
        markPromotionsAsViewed,
        resetCount,
      }}
    >
      {children}
    </PromotionContext.Provider>
  );
}

export function usePromotions() {
  const context = useContext(PromotionContext);
  if (context === undefined) {
    throw new Error('usePromotions must be used within a PromotionProvider');
  }
  return context;
}
