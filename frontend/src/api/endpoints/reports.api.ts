import { apiClient } from '../client';

export interface Report {
  id: number;
  reporter_id: number;
  reported_user_id: number;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  resolved_by?: number;
  reporter?: {
    id: number;
    username: string;
    full_name: string;
    user_type: string;
  };
  reported_user?: {
    id: number;
    username: string;
    full_name: string;
    user_type: string;
  };
}

export interface CreateReportRequest {
  reported_user_id: number;
  reason: string;
  description: string;
}

export interface ReportStats {
  total_reports: number;
  pending_reports: number;
  resolved_reports: number;
  dismissed_reports: number;
}

export const reportsApi = {
  // Create a report
  createReport: async (data: CreateReportRequest): Promise<Report> => {
    const response = await apiClient.post('/reports/', data);
    return response as any;
  },

  // Get my submitted reports
  getMyReports: async (): Promise<Report[]> => {
    const response = await apiClient.get('/reports/my-reports');
    return response as any;
  },

  // Get reports about me
  getReportsAboutMe: async (): Promise<Report[]> => {
    const response = await apiClient.get('/reports/about-me');
    return response as any;
  },

  // Admin: Get all reports
  getAllReports: async (status?: 'pending' | 'resolved' | 'dismissed'): Promise<Report[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/reports/', { params });
    return response as any;
  },

  // Admin: Update report status
  updateReportStatus: async (
    reportId: number,
    status: 'resolved' | 'dismissed',
    resolution_notes?: string
  ): Promise<Report> => {
    const response = await apiClient.put(`/reports/${reportId}/status`, {
      status,
      resolution_notes,
    });
    return response as any;
  },

  // Get report stats
  getReportStats: async (): Promise<ReportStats> => {
    const response = await apiClient.get('/reports/stats');
    return response as any;
  },
};