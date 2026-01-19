import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth.api';
import { tokenStorage, userStorage, clearAllStorage } from '../services/storage';
import { websocketService, WS_EVENTS } from '../services/websocket';
import { type User, UserType, type LoginRequest, type RegisterRequest } from '../types';

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
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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

  // Listen for real-time credit updates via WebSocket
  useEffect(() => {
    if (!user) return;

    const unsubscribe = websocketService.on(WS_EVENTS.CREDIT_UPDATE, (data) => {
      console.log('[AuthContext] Credit update received:', data);
      if (data && typeof data.credits === 'number') {
        setUser((prevUser) => {
          if (!prevUser) return prevUser;
          return {
            ...prevUser,
            credits: data.credits,
          };
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  const login = async (credentials: LoginRequest, fromRegister = false) => {
    // Prevent concurrent auth operations
    if (isAuthenticating) {
      throw { detail: 'Authentication already in progress' };
    }

    setIsAuthenticating(true);
    if (!fromRegister) {
      setIsLoading(true);
    }

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
      setIsAuthenticating(false);
      if (!fromRegister) {
        setIsLoading(false);
      }
    }
  };

  const register = async (data: RegisterRequest) => {
    // Prevent concurrent auth operations
    if (isAuthenticating) {
      throw { detail: 'Authentication already in progress' };
    }

    setIsLoading(true);
    try {
      await authApi.register(data);
      // After registration, login automatically (pass fromRegister=true to prevent nested isLoading)
      await login({ username: data.username, password: data.password }, true);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Prevent concurrent auth operations
    if (isAuthenticating) {
      return; // Silently return if already in auth operation
    }

    setIsLoading(true);
    try {
      await authApi.logout();
    } catch (error) {
      // Even if logout API fails, we should still clear local state
      console.error('Logout API error (clearing local state anyway):', error);
    } finally {
      // Always clear local state and storage
      await clearAllStorage();
      setUser(null);
      setUserType(null);
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
