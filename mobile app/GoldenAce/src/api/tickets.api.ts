import { api } from '../services/api';

export type TicketCategory =
  | 'account'
  | 'payment'
  | 'technical'
  | 'promotion'
  | 'report_user'
  | 'feedback'
  | 'appeal_review'
  | 'appeal_report'
  | 'other';

export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  user_id: number;
  assigned_admin_id?: number;
  assigned_admin?: {
    id: number;
    username: string;
    full_name?: string;
    user_type: string;
    profile_picture?: string;
  };
  user?: {
    id: number;
    username: string;
    full_name?: string;
    user_type: string;
    profile_picture?: string;
  };
  message_count?: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  content: string;
  file_url?: string;
  file_name?: string;
  is_internal_note: boolean;
  created_at: string;
  sender?: {
    id: number;
    username: string;
    full_name?: string;
    user_type: string;
    profile_picture?: string;
  };
  // For backwards compatibility - can derive from sender.user_type
  is_staff?: boolean;
}

export interface CreateTicketData {
  subject: string;
  message: string;  // Backend expects 'message' not 'description'
  category: TicketCategory;
  priority?: TicketPriority;
}

const TICKET_ENDPOINTS = {
  BASE: '/tickets/',  // Trailing slash required for POST
  MY_TICKETS: '/tickets/my-tickets',
  TICKET: (id: number) => `/tickets/${id}`,
  MESSAGES: (id: number) => `/tickets/${id}/messages`,
};

export const ticketsApi = {
  // Get all user's tickets
  getTickets: async (status?: TicketStatus): Promise<Ticket[]> => {
    try {
      const params: Record<string, string | number> = {};
      if (status) params.status_filter = status;

      const response = await api.get(TICKET_ENDPOINTS.MY_TICKETS, { params });
      // Backend returns { tickets: [...], total: N }
      const data = response as unknown as { tickets: Ticket[]; total: number };
      return data.tickets || [];
    } catch (error) {
      throw error;
    }
  },

  // Get single ticket
  getTicket: async (ticketId: number): Promise<Ticket> => {
    try {
      const response = await api.get(TICKET_ENDPOINTS.TICKET(ticketId));
      return response as unknown as Ticket;
    } catch (error) {
      throw error;
    }
  },

  // Create new ticket
  createTicket: async (data: CreateTicketData): Promise<Ticket> => {
    try {
      const response = await api.post(TICKET_ENDPOINTS.BASE, data);
      return response as unknown as Ticket;
    } catch (error) {
      throw error;
    }
  },

  // Get ticket messages
  getMessages: async (ticketId: number): Promise<TicketMessage[]> => {
    try {
      const response = await api.get(TICKET_ENDPOINTS.MESSAGES(ticketId));
      return response as unknown as TicketMessage[];
    } catch (error) {
      throw error;
    }
  },

  // Add message to ticket
  addMessage: async (ticketId: number, content: string): Promise<TicketMessage> => {
    try {
      const response = await api.post(TICKET_ENDPOINTS.MESSAGES(ticketId), { content });
      return response as unknown as TicketMessage;
    } catch (error) {
      throw error;
    }
  },

  // Close ticket
  closeTicket: async (ticketId: number): Promise<Ticket> => {
    try {
      const response = await api.patch(TICKET_ENDPOINTS.TICKET(ticketId), { status: 'closed' });
      return response as unknown as Ticket;
    } catch (error) {
      throw error;
    }
  },
};
