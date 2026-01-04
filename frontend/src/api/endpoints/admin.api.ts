import { apiClient } from '../client';
import { UserType } from '@/types';

// Dashboard Statistics
export interface DashboardStats {
  users: {
    total: number;
    clients: number;
    players: number;
    active: number;
    online: number;
    recent_registrations: number;
    pending_approvals: number;
  };
  messages: {
    total: number;
    today: number;
  };
  promotions: {
    active: number;
    total_claims: number;
  };
  reviews: {
    total: number;
    average_rating: number;
  };
  reports: {
    pending: number;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  user_type: UserType;
  user_id: string;
  is_active: boolean;
  is_approved: boolean;
  is_online: boolean;
  created_at: string;
  company_name?: string;
  player_level?: number;
  credits?: number;
}

export interface UsersResponse {
  users: User[];
  total: number;
  skip: number;
  limit: number;
}

export interface PendingApprovalsResponse {
  pending_users: User[];
  total: number;
}

export interface Promotion {
  id: number;
  title: string;
  description: string;
  promotion_type: string;
  value: number;
  status: string;
  created_by: number;
  created_at: string;
  start_date: string;
  end_date: string;
  total_claims?: number;
}

export interface PromotionsResponse {
  promotions: Promotion[];
  total: number;
  skip: number;
  limit: number;
}

export interface Report {
  id: number;
  reporter_id: number;
  reported_user_id: number;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
  reviewed_by?: number;
  reviewed_at?: string;
  admin_notes?: string;
  reporter?: {
    username: string;
    full_name: string;
  };
  reported_user?: {
    username: string;
    full_name: string;
  };
}

export interface ReportsResponse {
  reports: Report[];
  total: number;
  skip: number;
  limit: number;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'disputed';

export interface Review {
  id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  title: string;
  comment?: string;
  status: ReviewStatus;
  admin_notes?: string;
  moderated_by?: number;
  moderated_at?: string;
  appeal_ticket_id?: number;
  created_at: string;
  updated_at?: string;
  reviewer?: {
    username: string;
    full_name: string;
  };
  reviewee?: {
    username: string;
    full_name: string;
  };
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  skip: number;
  limit: number;
}

export interface ReviewModerationResponse {
  reviews: Review[];
  total_count: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  disputed_count: number;
}

export type ReportStatus = 'pending' | 'investigating' | 'valid' | 'invalid' | 'malicious';

export interface ReportDetail {
  id: number;
  reporter_id: number;
  reported_user_id: number;
  reporter_name: string;
  reporter_username: string;
  reported_user_name: string;
  reported_user_username: string;
  reason: string;
  evidence?: string;
  status: ReportStatus;
  admin_notes?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  action_taken?: string;
  appeal_ticket_id?: number;
  created_at: string;
  updated_at?: string;
}

export interface ReportInvestigationResponse {
  reports: ReportDetail[];
  total_count: number;
  pending_count: number;
  investigating_count: number;
  warning_count: number;
  resolved_count: number;
  valid_count: number;
  invalid_count: number;
  malicious_count: number;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    username: string;
    full_name: string;
  };
  receiver?: {
    username: string;
    full_name: string;
  };
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
  skip: number;
  limit: number;
}

export const adminApi = {
  // Dashboard Stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/admin/dashboard-stats');
    return response as any;
  },

  // User Management
  getUsers: async (params?: {
    skip?: number;
    limit?: number;
    user_type?: UserType;
    search?: string;
    is_active?: boolean;
    is_approved?: boolean;
  }): Promise<UsersResponse> => {
    const response = await apiClient.get('/admin/users', { params });
    return response as any;
  },

  approveUser: async (userId: number): Promise<{ message: string; user: User }> => {
    const response = await apiClient.patch(`/admin/users/${userId}/approve`);
    return response as any;
  },

  rejectUser: async (userId: number): Promise<{ message: string; user: User }> => {
    const response = await apiClient.patch(`/admin/users/${userId}/reject`);
    return response as any;
  },

  getPendingApprovals: async (): Promise<PendingApprovalsResponse> => {
    const response = await apiClient.get('/admin/pending-approvals');
    return response as any;
  },

  toggleUserStatus: async (userId: number): Promise<{ message: string; user: User }> => {
    const response = await apiClient.patch(`/admin/users/${userId}/toggle-status`);
    return response as any;
  },

  deleteUser: async (userId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response as any;
  },

  // Promotions Management
  getPromotions: async (params?: {
    skip?: number;
    limit?: number;
    status?: string;
  }): Promise<PromotionsResponse> => {
    const response = await apiClient.get('/admin/promotions', { params });
    return response as any;
  },

  cancelPromotion: async (promotionId: number): Promise<{ message: string; promotion: Promotion }> => {
    const response = await apiClient.patch(`/admin/promotions/${promotionId}/cancel`);
    return response as any;
  },

  // Reports Management
  getReports: async (params?: {
    skip?: number;
    limit?: number;
    status?: string;
  }): Promise<ReportsResponse> => {
    const response = await apiClient.get('/admin/reports', { params });
    return response as any;
  },

  updateReportStatus: async (
    reportId: number,
    status: string,
    adminNotes?: string
  ): Promise<{ message: string; report: Report }> => {
    const response = await apiClient.patch(`/admin/reports/${reportId}/status`, {
      status,
      admin_notes: adminNotes,
    });
    return response as any;
  },

  // Reviews Management
  getReviews: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<ReviewsResponse> => {
    const response = await apiClient.get('/admin/reviews', { params });
    return response as any;
  },

  deleteReview: async (reviewId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/admin/reviews/${reviewId}`);
    return response as any;
  },

  // Review Moderation
  getPendingReviews: async (params?: {
    skip?: number;
    limit?: number;
    status_filter?: ReviewStatus;
  }): Promise<ReviewModerationResponse> => {
    const response = await apiClient.get('/reviews/admin/pending', { params });
    return response as any;
  },

  moderateReview: async (
    reviewId: number,
    action: 'approve' | 'reject',
    adminNotes?: string
  ): Promise<{ message: string; review_id: number; new_status: string }> => {
    const response = await apiClient.post(`/reviews/admin/${reviewId}/moderate`, {
      action,
      admin_notes: adminNotes,
    });
    return response as any;
  },

  // Report Investigation
  getPendingReports: async (params?: {
    skip?: number;
    limit?: number;
    status_filter?: ReportStatus;
  }): Promise<ReportInvestigationResponse> => {
    const response = await apiClient.get('/reports/admin/pending', { params });
    return response as any;
  },

  investigateReport: async (
    reportId: number,
    action: 'investigating' | 'valid' | 'invalid' | 'malicious',
    adminNotes?: string,
    actionTaken?: string
  ): Promise<{ message: string; report_id: number; new_status: string }> => {
    const response = await apiClient.post(`/reports/admin/${reportId}/investigate`, {
      action,
      admin_notes: adminNotes,
      action_taken: actionTaken,
    });
    return response as any;
  },

  getReporterStats: async (userId: number): Promise<{
    user_id: number;
    username: string;
    total_reports_made: number;
    valid_reports: number;
    invalid_reports: number;
    malicious_reports: number;
    trust_score: number;
    is_suspended: boolean;
  }> => {
    const response = await apiClient.get(`/reports/admin/reporter-stats/${userId}`);
    return response as any;
  },

  // Messages
  getMessages: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<MessagesResponse> => {
    const response = await apiClient.get('/admin/messages', { params });
    return response as any;
  },

  // Broadcast
  broadcastMessage: async (
    message: string,
    userType?: UserType
  ): Promise<{ message: string; recipients: number }> => {
    const response = await apiClient.post('/admin/broadcast-message', {
      message,
      user_type: userType,
    });
    return response as any;
  },

  // Password Reset
  resetUserPassword: async (
    userId: number,
    options: { new_password?: string; generate_random?: boolean }
  ): Promise<{ message: string; temp_password?: string }> => {
    const response = await apiClient.post(`/admin/users/${userId}/reset-password`, options);
    return response as any;
  },
};
