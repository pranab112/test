import { apiClient } from '../client';

// Types
export interface ProfileUpdateRequest {
  full_name?: string;
  company_name?: string;
  bio?: string;
  phone?: string;
}

export interface NotificationSettings {
  email_notifications: boolean;
  promotion_updates: boolean;
  message_alerts: boolean;
  review_alerts: boolean;
  report_updates: boolean;
}

export interface TwoFactorStatus {
  enabled: boolean;
  has_backup_codes: boolean;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  last_active: string;
  is_current: boolean;
}

// Payment Method Types
export interface PaymentMethod {
  id: number;
  name: string;
  display_name: string;
  icon_url?: string;
  is_active: boolean;
}

export interface PaymentMethodDetail {
  method_id: number;
  method_name: string;
  method_display_name: string;
  account_info?: string;
}

export interface PlayerPaymentPreferences {
  player_id: number;
  receive_methods: PaymentMethodDetail[];
  send_methods: PaymentMethodDetail[];
  updated_at?: string;
}

export interface PlayerPaymentPreferencesUpdate {
  receive_methods: number[];
  send_methods: number[];
  receive_details?: Record<string, string>;
  send_details?: Record<string, string>;
}

export const settingsApi = {
  // Profile
  updateProfile: async (data: ProfileUpdateRequest): Promise<{ message: string }> => {
    const response = await apiClient.patch('/profiles/me', data);
    return response as any;
  },

  uploadProfilePicture: async (userId: number, file: File): Promise<{ profile_picture_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/profiles/${userId}/profile-picture`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response as any;
  },

  deleteProfilePicture: async (userId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/profiles/${userId}/profile-picture`);
    return response as any;
  },

  // Two-Factor Authentication
  get2FAStatus: async (): Promise<TwoFactorStatus> => {
    const response = await apiClient.get('/2fa/status');
    return response as any;
  },

  setup2FA: async (): Promise<TwoFactorSetupResponse> => {
    const response = await apiClient.post('/2fa/setup');
    return response as any;
  },

  verify2FA: async (code: string): Promise<{ message: string; enabled: boolean }> => {
    const response = await apiClient.post('/2fa/verify', { code });
    return response as any;
  },

  disable2FA: async (code: string): Promise<{ message: string; enabled: boolean }> => {
    const response = await apiClient.post('/2fa/disable', { code });
    return response as any;
  },

  validate2FACode: async (code: string): Promise<{ valid: boolean; used_backup_code: boolean; message: string }> => {
    const response = await apiClient.post('/2fa/validate', { code });
    return response as any;
  },

  regenerateBackupCodes: async (code: string): Promise<{ message: string; backup_codes: string[] }> => {
    const response = await apiClient.post('/2fa/regenerate-backup-codes', { code });
    return response as any;
  },

  // Notification Settings
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    const response = await apiClient.get('/users/me/notifications');
    return response as any;
  },

  updateNotificationSettings: async (settings: NotificationSettings): Promise<{ message: string }> => {
    const response = await apiClient.patch('/users/me/notifications', settings);
    return response as any;
  },

  // Sessions
  getActiveSessions: async (): Promise<ActiveSession[]> => {
    const response = await apiClient.get('/auth/sessions');
    return response as any;
  },

  logoutAllSessions: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/logout-all');
    return response as any;
  },

  logoutSession: async (sessionId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/auth/sessions/${sessionId}`);
    return response as any;
  },

  // Payment Methods
  getAllPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await apiClient.get('/payment-methods/');
    return response as any;
  },

  getMyPaymentPreferences: async (): Promise<PlayerPaymentPreferences> => {
    const response = await apiClient.get('/payment-methods/player/my-preferences');
    return response as any;
  },

  updateMyPaymentPreferences: async (
    data: PlayerPaymentPreferencesUpdate
  ): Promise<PlayerPaymentPreferences> => {
    const response = await apiClient.put('/payment-methods/player/my-preferences', data);
    return response as any;
  },

  // Account Deletion
  deleteMyAccount: async (password: string): Promise<{ message: string }> => {
    const response = await apiClient.delete('/users/me', {
      data: { password },
    });
    return response as any;
  },
};
