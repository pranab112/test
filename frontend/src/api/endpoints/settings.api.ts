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

export interface EmailVerificationStatus {
  secondary_email: string | null;
  is_email_verified: boolean;
  verification_pending: boolean;
}

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  last_active: string;
  is_current: boolean;
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

  // Email Verification
  getEmailVerificationStatus: async (): Promise<EmailVerificationStatus> => {
    const response = await apiClient.get('/email/status');
    return response as any;
  },

  sendEmailVerificationOTP: async (email: string): Promise<{ message: string; verification_sent: boolean }> => {
    const response = await apiClient.post('/email/send-otp', { email });
    return response as any;
  },

  verifyEmailOTP: async (otp: string): Promise<{ message: string; verified: boolean }> => {
    const response = await apiClient.post('/email/verify-otp', { otp });
    return response as any;
  },

  resendEmailOTP: async (): Promise<{ message: string; verification_sent: boolean }> => {
    const response = await apiClient.post('/email/resend-otp');
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
};
