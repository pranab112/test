import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';
import { tokenStorage, userStorage, clearAllStorage } from '../services/storage';
import type { LoginRequest, RegisterRequest, TokenResponse, User } from '../types';

export const authApi = {
  register: async (data: RegisterRequest): Promise<User> => {
    try {
      const response = await api.post<User>(API_ENDPOINTS.AUTH.REGISTER, data);
      return response as unknown as User;
    } catch (error) {
      throw error;
    }
  },

  login: async (credentials: LoginRequest): Promise<TokenResponse> => {
    try {
      // FastAPI expects form data for OAuth2PasswordRequestForm
      const formData = new URLSearchParams();
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);

      const response = await api.post<TokenResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenResponse = response as unknown as TokenResponse;

      // Store token and user type
      await tokenStorage.setToken(tokenResponse.access_token);
      await userStorage.setUserType(tokenResponse.user_type);

      return tokenResponse;
    } catch (error) {
      throw error;
    }
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await api.get<User>(API_ENDPOINTS.AUTH.ME);
      const user = response as unknown as User;

      // Store user data
      await userStorage.setUser(user);

      return user;
    } catch (error) {
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await clearAllStorage();
    } catch (error) {
      // Still clear storage even if there's an error
      console.error('Logout error:', error);
    }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    try {
      const response = await api.post<{ message: string }>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  isAuthenticated: async (): Promise<boolean> => {
    try {
      const token = await tokenStorage.getToken();
      return !!token;
    } catch (error) {
      return false;
    }
  },
};
