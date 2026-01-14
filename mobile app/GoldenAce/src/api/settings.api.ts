import { api } from '../services/api';
import type { User } from '../types';

const SETTINGS_ENDPOINTS = {
  PROFILE: '/settings/profile',
  PASSWORD: '/auth/change-password',
  NOTIFICATIONS: '/settings/notifications',
  DELETE_ACCOUNT: '/settings/delete-account',
  PROFILE_PICTURE: '/settings/profile-picture',
  PAYMENT_METHODS: '/settings/payment-methods',
  MY_PAYMENT_PREFERENCES: '/settings/my-payment-preferences',
};

const EMAIL_ENDPOINTS = {
  SEND_OTP: '/email/send-otp',
  VERIFY_OTP: '/email/verify-otp',
  RESEND_OTP: '/email/resend-otp',
  STATUS: '/email/status',
  REMOVE: '/email/remove',
};

export interface NotificationSettings {
  notification_sounds: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  promotions_rewards: boolean;
  friend_requests: boolean;
  messages: boolean;
}

export interface ProfileUpdateData {
  full_name?: string;
  bio?: string;
  company_name?: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  icon?: string;
}

export interface PaymentPreference {
  method_id: number;
  can_receive: boolean;
  can_send: boolean;
  account_details?: string;
}

export const settingsApi = {
  // Update profile
  updateProfile: async (data: ProfileUpdateData): Promise<User> => {
    try {
      const response = await api.put(SETTINGS_ENDPOINTS.PROFILE, data);
      return response as unknown as User;
    } catch (error) {
      throw error;
    }
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    try {
      const response = await api.post(SETTINGS_ENDPOINTS.PASSWORD, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Get notification settings
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    try {
      const response = await api.get(SETTINGS_ENDPOINTS.NOTIFICATIONS);
      return response as unknown as NotificationSettings;
    } catch (error) {
      throw error;
    }
  },

  // Update notification settings
  updateNotificationSettings: async (settings: Partial<NotificationSettings>): Promise<NotificationSettings> => {
    try {
      const response = await api.put(SETTINGS_ENDPOINTS.NOTIFICATIONS, settings);
      return response as unknown as NotificationSettings;
    } catch (error) {
      throw error;
    }
  },

  // Delete account
  deleteAccount: async (password: string): Promise<{ message: string }> => {
    try {
      const response = await api.post(SETTINGS_ENDPOINTS.DELETE_ACCOUNT, { password });
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Upload profile picture
  uploadProfilePicture: async (imageUri: string): Promise<{ profile_picture: string }> => {
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      } as unknown as Blob);

      const response = await api.post(SETTINGS_ENDPOINTS.PROFILE_PICTURE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response as unknown as { profile_picture: string };
    } catch (error) {
      throw error;
    }
  },

  // Delete profile picture
  deleteProfilePicture: async (): Promise<{ message: string }> => {
    try {
      const response = await api.delete(SETTINGS_ENDPOINTS.PROFILE_PICTURE);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Email verification - uses /email/* endpoints
  sendEmailVerificationOTP: async (email: string): Promise<{ message: string; verification_sent: boolean }> => {
    try {
      const response = await api.post(EMAIL_ENDPOINTS.SEND_OTP, { email });
      return response as unknown as { message: string; verification_sent: boolean };
    } catch (error) {
      throw error;
    }
  },

  verifyEmailOTP: async (otp: string): Promise<{ message: string; verified: boolean }> => {
    try {
      const response = await api.post(EMAIL_ENDPOINTS.VERIFY_OTP, { otp });
      return response as unknown as { message: string; verified: boolean };
    } catch (error) {
      throw error;
    }
  },

  resendEmailOTP: async (): Promise<{ message: string; verification_sent: boolean }> => {
    try {
      const response = await api.post(EMAIL_ENDPOINTS.RESEND_OTP);
      return response as unknown as { message: string; verification_sent: boolean };
    } catch (error) {
      throw error;
    }
  },

  getEmailVerificationStatus: async (): Promise<{
    secondary_email: string | null;
    is_email_verified: boolean;
    verification_pending: boolean;
    resend_count?: number;
    next_resend_available_at?: string | null;
    cooldown_seconds?: number;
  }> => {
    try {
      const response = await api.get(EMAIL_ENDPOINTS.STATUS);
      return response as unknown as {
        secondary_email: string | null;
        is_email_verified: boolean;
        verification_pending: boolean;
        resend_count?: number;
        next_resend_available_at?: string | null;
        cooldown_seconds?: number;
      };
    } catch (error) {
      throw error;
    }
  },

  removeSecondaryEmail: async (): Promise<{ message: string }> => {
    try {
      const response = await api.delete(EMAIL_ENDPOINTS.REMOVE);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Payment methods
  getAllPaymentMethods: async (): Promise<PaymentMethod[]> => {
    try {
      const response = await api.get(SETTINGS_ENDPOINTS.PAYMENT_METHODS);
      return response as unknown as PaymentMethod[];
    } catch (error) {
      throw error;
    }
  },

  getMyPaymentPreferences: async (): Promise<PaymentPreference[]> => {
    try {
      const response = await api.get(SETTINGS_ENDPOINTS.MY_PAYMENT_PREFERENCES);
      return response as unknown as PaymentPreference[];
    } catch (error) {
      throw error;
    }
  },

  updatePaymentPreferences: async (preferences: PaymentPreference[]): Promise<PaymentPreference[]> => {
    try {
      const response = await api.put(SETTINGS_ENDPOINTS.MY_PAYMENT_PREFERENCES, { preferences });
      return response as unknown as PaymentPreference[];
    } catch (error) {
      throw error;
    }
  },
};
