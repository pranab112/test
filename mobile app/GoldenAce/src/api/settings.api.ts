import { api } from '../services/api';
import type { User } from '../types';

const SETTINGS_ENDPOINTS = {
  PROFILE: '/settings/profile',
  PASSWORD: '/auth/change-password',
  NOTIFICATIONS: '/settings/notifications',
  DELETE_ACCOUNT: '/settings/delete-account',
  PROFILE_PICTURE: '/settings/profile-picture',
  EMAIL_VERIFICATION: '/settings/email-verification',
  VERIFY_EMAIL_OTP: '/settings/verify-email-otp',
  RESEND_EMAIL_OTP: '/settings/resend-email-otp',
  EMAIL_STATUS: '/settings/email-verification-status',
  PAYMENT_METHODS: '/settings/payment-methods',
  MY_PAYMENT_PREFERENCES: '/settings/my-payment-preferences',
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
    const response = await api.put(SETTINGS_ENDPOINTS.PROFILE, data);
    return response as unknown as User;
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post(SETTINGS_ENDPOINTS.PASSWORD, {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response as unknown as { message: string };
  },

  // Get notification settings
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    const response = await api.get(SETTINGS_ENDPOINTS.NOTIFICATIONS);
    return response as unknown as NotificationSettings;
  },

  // Update notification settings
  updateNotificationSettings: async (settings: Partial<NotificationSettings>): Promise<NotificationSettings> => {
    const response = await api.put(SETTINGS_ENDPOINTS.NOTIFICATIONS, settings);
    return response as unknown as NotificationSettings;
  },

  // Delete account
  deleteAccount: async (password: string): Promise<{ message: string }> => {
    const response = await api.post(SETTINGS_ENDPOINTS.DELETE_ACCOUNT, { password });
    return response as unknown as { message: string };
  },

  // Upload profile picture
  uploadProfilePicture: async (imageUri: string): Promise<{ profile_picture: string }> => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await api.post(SETTINGS_ENDPOINTS.PROFILE_PICTURE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response as unknown as { profile_picture: string };
  },

  // Delete profile picture
  deleteProfilePicture: async (): Promise<{ message: string }> => {
    const response = await api.delete(SETTINGS_ENDPOINTS.PROFILE_PICTURE);
    return response as unknown as { message: string };
  },

  // Email verification
  sendEmailVerificationOTP: async (): Promise<{ message: string }> => {
    const response = await api.post(SETTINGS_ENDPOINTS.EMAIL_VERIFICATION);
    return response as unknown as { message: string };
  },

  verifyEmailOTP: async (otp: string): Promise<{ message: string }> => {
    const response = await api.post(SETTINGS_ENDPOINTS.VERIFY_EMAIL_OTP, { otp });
    return response as unknown as { message: string };
  },

  resendEmailOTP: async (): Promise<{ message: string }> => {
    const response = await api.post(SETTINGS_ENDPOINTS.RESEND_EMAIL_OTP);
    return response as unknown as { message: string };
  },

  getEmailVerificationStatus: async (): Promise<{ is_verified: boolean }> => {
    const response = await api.get(SETTINGS_ENDPOINTS.EMAIL_STATUS);
    return response as unknown as { is_verified: boolean };
  },

  // Payment methods
  getAllPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await api.get(SETTINGS_ENDPOINTS.PAYMENT_METHODS);
    return response as unknown as PaymentMethod[];
  },

  getMyPaymentPreferences: async (): Promise<PaymentPreference[]> => {
    const response = await api.get(SETTINGS_ENDPOINTS.MY_PAYMENT_PREFERENCES);
    return response as unknown as PaymentPreference[];
  },

  updatePaymentPreferences: async (preferences: PaymentPreference[]): Promise<PaymentPreference[]> => {
    const response = await api.put(SETTINGS_ENDPOINTS.MY_PAYMENT_PREFERENCES, { preferences });
    return response as unknown as PaymentPreference[];
  },
};
