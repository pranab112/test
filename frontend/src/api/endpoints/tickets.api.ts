import { apiClient } from '../client';
import {
  Ticket,
  TicketDetail,
  TicketListResponse,
  TicketCreateRequest,
  TicketUpdateRequest,
  TicketMessageCreateRequest,
  TicketMessage,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketStatsResponse,
} from '@/types/ticket.types';

export const ticketsApi = {
  // ============== USER ENDPOINTS ==============

  /**
   * Create a new support ticket
   */
  createTicket: async (data: TicketCreateRequest): Promise<TicketDetail> => {
    return await apiClient.post('/tickets/', data) as any;
  },

  /**
   * Get current user's tickets
   */
  getMyTickets: async (
    statusFilter?: TicketStatus,
    skip = 0,
    limit = 20
  ): Promise<TicketListResponse> => {
    const params: any = { skip, limit };
    if (statusFilter) params.status_filter = statusFilter;

    return await apiClient.get('/tickets/my-tickets', { params }) as any;
  },

  /**
   * Get a specific ticket with all messages
   */
  getTicket: async (ticketId: number): Promise<TicketDetail> => {
    return await apiClient.get(`/tickets/${ticketId}`) as any;
  },

  /**
   * Add a message to a ticket
   */
  addMessage: async (
    ticketId: number,
    data: TicketMessageCreateRequest
  ): Promise<TicketMessage> => {
    return await apiClient.post(`/tickets/${ticketId}/messages`, data) as any;
  },

  /**
   * Close own ticket
   */
  closeTicket: async (ticketId: number): Promise<{ message: string; ticket_number: string }> => {
    return await apiClient.post(`/tickets/${ticketId}/close`) as any;
  },

  // ============== ADMIN ENDPOINTS ==============

  /**
   * Get all tickets (admin only) with filters
   */
  getAllTickets: async (params: {
    status_filter?: TicketStatus;
    priority_filter?: TicketPriority;
    category_filter?: TicketCategory;
    assigned_to_me?: boolean;
    unassigned?: boolean;
    skip?: number;
    limit?: number;
  } = {}): Promise<TicketListResponse> => {
    return await apiClient.get('/tickets/admin/all', { params }) as any;
  },

  /**
   * Update ticket (admin only)
   */
  updateTicket: async (
    ticketId: number,
    data: TicketUpdateRequest
  ): Promise<Ticket> => {
    return await apiClient.put(`/tickets/admin/${ticketId}`, data) as any;
  },

  /**
   * Assign ticket to an admin
   */
  assignTicket: async (
    ticketId: number,
    adminId?: number
  ): Promise<{ message: string; ticket_number: string; assigned_to: string }> => {
    const response = await apiClient.post(`/tickets/admin/${ticketId}/assign`, { admin_id: adminId });
    return response as any;
  },

  /**
   * Resolve a ticket (admin only)
   */
  resolveTicket: async (
    ticketId: number,
    resolutionMessage?: string
  ): Promise<{ message: string; ticket_number: string }> => {
    const response = await apiClient.post(`/tickets/admin/${ticketId}/resolve`, {
      resolution_message: resolutionMessage,
    });
    return response as any;
  },

  /**
   * Get ticket statistics (admin only)
   */
  getStats: async (): Promise<TicketStatsResponse> => {
    return await apiClient.get('/tickets/admin/stats') as any;
  },
};
