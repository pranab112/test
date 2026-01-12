export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_USER = 'waiting_user',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketCategory {
  ACCOUNT = 'account',
  PAYMENT = 'payment',
  TECHNICAL = 'technical',
  GAME_ISSUE = 'game_issue',
  REPORT_DISPUTE = 'report_dispute',
  APPEAL_REPORT = 'appeal_report',
  OTHER = 'other',
}

export interface TicketUserInfo {
  id: number;
  username: string;
  full_name: string | null;
  user_type: string;
  profile_picture: string | null;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  content: string;
  file_url: string | null;
  file_name: string | null;
  is_internal_note: boolean;
  created_at: string;
  sender: TicketUserInfo | null;
}

export interface Ticket {
  id: number;
  ticket_number: string;
  user_id: number;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_admin_id: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  user: TicketUserInfo | null;
  assigned_admin: TicketUserInfo | null;
  message_count: number;
}

export interface TicketDetail extends Ticket {
  messages: TicketMessage[];
}

export interface TicketListResponse {
  tickets: Ticket[];
  total_count: number;
  open_count: number;
  resolved_count: number;
}

export interface TicketCreateRequest {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  message: string;
}

export interface TicketUpdateRequest {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_admin_id?: number;
}

export interface TicketMessageCreateRequest {
  content: string;
  is_internal_note?: boolean;
}

export interface TicketStatsResponse {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  waiting_user_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  urgent_tickets: number;
  high_priority_tickets: number;
  by_category: Record<string, number>;
  avg_resolution_time: number | null;
}
