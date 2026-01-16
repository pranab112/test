import { api } from '../services/api';

export type TicketCategory =
  | 'account'
  | 'payment'
  | 'technical'
  | 'game'
  | 'report'
  | 'appeal_review'
  | 'appeal_report'
  | 'promotion'
  | 'feedback'
  | 'other';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: number;
  subject: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  user_id: number;
  assigned_to?: number;
  assigned_to_username?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_username: string;
  sender_full_name?: string;
  sender_profile_picture?: string;
  content: string;
  is_staff: boolean;
  created_at: string;
}

export interface CreateTicketData {
  subject: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
}

const TICKET_ENDPOINTS = {
  BASE: '/tickets',
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
