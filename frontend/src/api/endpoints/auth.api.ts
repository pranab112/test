import { api } from '../client';
import { API_ENDPOINTS } from '@/config/api.config';
import type { LoginRequest, RegisterRequest, TokenResponse, User } from '@/types';

export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await api.post<User>(API_ENDPOINTS.AUTH.REGISTER, data);
    return response as unknown as User;
  },

  /**
   * Login user
   */
  login: async (credentials: LoginRequest): Promise<TokenResponse> => {
    // FastAPI expects form data for OAuth2PasswordRequestForm
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post<TokenResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response as unknown as TokenResponse;
  },

  /**
   * Get current user
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>(API_ENDPOINTS.AUTH.ME);
    return response as unknown as User;
  },

  /**
   * Logout (client-side only)
   */
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },
};
