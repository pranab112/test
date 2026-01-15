import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER: 'user',
  USER_TYPE: 'user_type',
} as const;

// For web platform, use localStorage as fallback
const webStorage = {
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
  deleteItem: (key: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
    return Promise.resolve();
  },
};

const storage = Platform.OS === 'web' ? webStorage : {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  deleteItem: SecureStore.deleteItemAsync,
};

export const tokenStorage = {
  getToken: async (): Promise<string | null> => {
    try {
      return await storage.getItem(KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  setToken: async (token: string): Promise<void> => {
    try {
      await storage.setItem(KEYS.ACCESS_TOKEN, token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  },

  removeToken: async (): Promise<void> => {
    try {
      await storage.deleteItem(KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },
};

export const userStorage = {
  getUser: async (): Promise<any | null> => {
    try {
      const user = await storage.getItem(KEYS.USER);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  setUser: async (user: any): Promise<void> => {
    try {
      await storage.setItem(KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error setting user:', error);
    }
  },

  removeUser: async (): Promise<void> => {
    try {
      await storage.deleteItem(KEYS.USER);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  },

  getUserType: async (): Promise<string | null> => {
    try {
      return await storage.getItem(KEYS.USER_TYPE);
    } catch (error) {
      console.error('Error getting user type:', error);
      return null;
    }
  },

  setUserType: async (userType: string): Promise<void> => {
    try {
      await storage.setItem(KEYS.USER_TYPE, userType);
    } catch (error) {
      console.error('Error setting user type:', error);
    }
  },
};

export const clearAllStorage = async (): Promise<void> => {
  await tokenStorage.removeToken();
  await userStorage.removeUser();
  try {
    await storage.deleteItem(KEYS.USER_TYPE);
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};
