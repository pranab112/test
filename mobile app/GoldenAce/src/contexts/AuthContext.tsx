import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth.api';
import { tokenStorage, userStorage, clearAllStorage } from '../services/storage';
import type { User, UserType, LoginRequest, RegisterRequest } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userType: UserType | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<UserType | null>(null);

  const loadUser = useCallback(async () => {
    try {
      const token = await tokenStorage.getToken();
      if (token) {
        const storedUser = await userStorage.getUser();
        if (storedUser) {
          setUser(storedUser);
          setUserType(storedUser.user_type);
        }
        // Refresh user data from server
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
          setUserType(currentUser.user_type);
        } catch (error) {
          // Token might be expired, clear storage
          await clearAllStorage();
          setUser(null);
          setUserType(null);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const tokenResponse = await authApi.login(credentials);

      // Check if user is admin - mobile app doesn't support admin access
      if (tokenResponse.user_type === UserType.ADMIN) {
        // Clear the stored token since we're rejecting admin login
        await clearAllStorage();
        throw { detail: 'Admin accounts cannot access the mobile app. Please use the web dashboard instead.' };
      }

      setUserType(tokenResponse.user_type as UserType);

      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      await authApi.register(data);
      // After registration, login automatically
      await login({ username: data.username, password: data.password });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      setUser(null);
      setUserType(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      setUserType(currentUser.user_type);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        userType,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
