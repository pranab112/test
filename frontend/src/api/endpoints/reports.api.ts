import { apiClient } from '../client';

export type ReportStatus = 'pending' | 'investigating' | 'warning' | 'resolved' | 'valid' | 'invalid' | 'malicious';

export interface Report {
  id: number;
  reporter_id: number;
  reported_user_id: number;
  reporter_name?: string;
  reporter_username?: string;
  reported_user_name?: string;
  reported_user_username?: string;
  reason: string;
  evidence?: string;
  status: ReportStatus;
  admin_notes?: string;
  action_taken?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  appeal_ticket_id?: number;
  // Warning/Grace period fields
  warning_sent_at?: string;
  warning_deadline?: string;
  resolution_amount?: number;
  resolution_notes?: string;
  resolved_at?: string;
  resolution_proof?: string;
  auto_validated?: number;
  created_at: string;
  updated_at?: string;
}

export interface ReportWarning {
  report_id: number;
  status: string;
  reason: string;
  warning_sent_at: string;
  warning_deadline: string;
  resolution_amount?: number;
  resolution_notes?: string;
  days_remaining: number;
  hours_remaining: number;
}

export interface CreateReportRequest {
  reported_user_id: number;
  reason: string;
  evidence?: string;
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

  // Appeal a report (for reports against you that you want to dispute)
  appealReport: async (reportId: number, reason: string): Promise<{
    message: string;
    ticket_number: string;
    ticket_id: number;
    report_id: number;
  }> => {
    const response = await apiClient.post('/reports/appeal', {
      report_id: reportId,
      reason,
    });
    return response as any;
  },

  // Get my active warnings (reports with warning status against me)
  getMyWarnings: async (): Promise<ReportWarning[]> => {
    const response = await apiClient.get('/reports/my-warnings');
    return response as any;
  },

  // Resolve a report by providing proof of payment/refund
  resolveReport: async (reportId: number, resolutionProof: string, notes?: string): Promise<{
    message: string;
    report_id: number;
    new_status: string;
    resolved_at: string;
    days_remaining: number;
  }> => {
    const response = await apiClient.post(`/reports/${reportId}/resolve`, {
      resolution_proof: resolutionProof,
      notes,
    });
    return response as any;
  },
};
