import { apiClient } from '../client';

export interface Report {
  id: number;
  reporter_id: number;
  reported_user_id: number;
  reporter_name?: string;
  reporter_username?: string;
  reported_user_name?: string;
  reported_user_username?: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  updated_at?: string;
  admin_notes?: string;
}

export interface CreateReportRequest {
  reported_user_id: number;
  reason: string;
}

export interface UpdateReportRequest {
  reason: string;
}

export interface ReportListResponse {
  reports_made: Report[];
  reports_received: Report[];
}

export interface UserReportResponse {
  total_reports: number;
  my_report: Report | null;
  can_report: boolean;
}

export const reportsApi = {
  // Create a report
  createReport: async (data: CreateReportRequest): Promise<Report> => {
    const response = await apiClient.post('/reports/', data);
    return response as any;
  },

  // Get my reports (both made and received)
  getMyReports: async (): Promise<ReportListResponse> => {
    const response = await apiClient.get('/reports/my-reports');
    return response as any;
  },

  // Get reports for a specific user (shows total count and your report if exists)
  getUserReports: async (userId: number): Promise<UserReportResponse> => {
    const response = await apiClient.get(`/reports/user/${userId}`);
    return response as any;
  },

  // Update a report (only reporter can update)
  updateReport: async (reportId: number, data: UpdateReportRequest): Promise<Report> => {
    const response = await apiClient.put(`/reports/${reportId}`, data);
    return response as any;
  },

  // Delete a report (only reporter can delete)
  deleteReport: async (reportId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/reports/${reportId}`);
    return response as any;
  },
};
