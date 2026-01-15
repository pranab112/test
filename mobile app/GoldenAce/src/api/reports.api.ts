import { api } from '../services/api';
import type { Report, ReportCreate } from '../types';

interface ReportListResponse {
  reports_made: Report[];
  reports_received: Report[];
}

export const reportsApi = {
  // Create a report against a user
  createReport: async (data: ReportCreate): Promise<Report> => {
    try {
      const response = await api.post('/reports/', data);
      return response as unknown as Report;
    } catch (error) {
      throw error;
    }
  },

  // Get my reports (both made and received)
  getMyReports: async (): Promise<ReportListResponse> => {
    try {
      const response = await api.get('/reports/my-reports');
      return response as unknown as ReportListResponse;
    } catch (error) {
      throw error;
    }
  },

  // Get reports for a specific user (reports made against them)
  getUserReports: async (userId: number): Promise<Report[]> => {
    try {
      const response = await api.get(`/reports/user/${userId}`);
      return response as unknown as Report[];
    } catch (error) {
      throw error;
    }
  },

  // Update a report
  updateReport: async (
    reportId: number,
    data: { reason: string }
  ): Promise<Report> => {
    try {
      const response = await api.put(`/reports/${reportId}`, data);
      return response as unknown as Report;
    } catch (error) {
      throw error;
    }
  },

  // Delete a report
  deleteReport: async (reportId: number): Promise<{ message: string }> => {
    try {
      const response = await api.delete(`/reports/${reportId}`);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Get my warnings (reports where I'm the reported user with warning status)
  getMyWarnings: async (): Promise<Report[]> => {
    try {
      const response = await api.get('/reports/my-warnings');
      return response as unknown as Report[];
    } catch (error) {
      throw error;
    }
  },

  // Submit resolution for a warning
  submitResolution: async (
    reportId: number,
    data: { resolution_proof: string; notes?: string }
  ): Promise<{ message: string }> => {
    try {
      const response = await api.post(`/reports/${reportId}/resolve`, data);
      return response as unknown as { message: string };
    } catch (error) {
      throw error;
    }
  },

  // Appeal a report
  appealReport: async (data: {
    report_id: number;
    reason: string;
  }): Promise<{ message: string; ticket_id: number }> => {
    try {
      const response = await api.post('/reports/appeal', data);
      return response as unknown as { message: string; ticket_id: number };
    } catch (error) {
      throw error;
    }
  },
};
