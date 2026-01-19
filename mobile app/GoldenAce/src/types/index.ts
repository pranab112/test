// User Types
export enum UserType {
  CLIENT = 'client',
  PLAYER = 'player',
  ADMIN = 'admin',
}

// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  user_type: UserType;
  company_name?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_type: UserType;
}

export interface User {
  id: number;
  user_id: string;
  email?: string;
  username: string;
  full_name?: string;
  user_type: UserType;
  is_active: boolean;
  created_at: string;
  company_name?: string;
  player_level?: number;
  credits?: number;
  profile_picture?: string;
  is_online?: boolean;
  last_seen?: string;
  two_factor_enabled?: boolean;
  bio?: string;
}

// Game Types
export interface Game {
  id: number;
  name: string;
  display_name: string;
  icon_url: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ClientGame {
  id: number;
  client_id: number;
  game_id: number;
  is_active: boolean;
  game_link?: string;
  custom_image_url?: string;
  created_at: string;
  updated_at?: string;
  game?: Game;
}

// Offer Types
export type OfferType =
  | 'profile_completion'
  | 'first_deposit'
  | 'referral'
  | 'loyalty'
  | 'special_event';

export type OfferStatus = 'active' | 'inactive' | 'expired';
export type OfferClaimStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface PlatformOffer {
  id: number;
  title: string;
  description: string;
  offer_type: OfferType;
  bonus_amount: number;
  requirement_description?: string;
  max_claims?: number;
  max_claims_per_player: number;
  status: OfferStatus;
  start_date: string;
  end_date?: string;
  created_at: string;
  total_claims?: number;
}

export interface OfferClaim {
  id: number;
  offer_id: number;
  player_id: number;
  client_id: number;
  status: OfferClaimStatus;
  bonus_amount: number;
  verification_data?: string;
  claimed_at: string;
  processed_at?: string;
  offer_title?: string;
  client_name?: string;
  player_name?: string;
}

// Friend Types
export interface Friend {
  id: number;
  user_id?: string; // Unique ID for searching
  username: string;
  full_name: string;
  email?: string;
  user_type: string;
  profile_picture?: string;
  is_online: boolean;
  player_level?: number;
  credits?: number;
  created_at: string;
}

export interface FriendRequest {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: {
    id: number;
    username: string;
    full_name?: string;
    profile_picture?: string;
    user_type?: string;
  };
  receiver?: {
    id: number;
    username: string;
    full_name?: string;
    profile_picture?: string;
    user_type?: string;
  };
}

// Chat Types
export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  message_type: 'text' | 'image' | 'voice' | 'promotion' | 'credit_transfer';
  content?: string;
  file_url?: string;
  file_name?: string;
  duration?: number;
  is_read: boolean;
  created_at: string;
  // Credit transfer specific fields
  transfer_amount?: number;
  transfer_type?: 'add' | 'deduct';
  // Promotion specific fields
  promotion_id?: number;
  promotion_title?: string;
  promotion_image_url?: string;
  sender?: {
    id: number;
    username: string;
    full_name?: string;
    profile_picture?: string;
  };
}

export interface Conversation {
  friend: Friend;
  last_message?: Message;
  unread_count: number;
}

export interface MessageListResponse {
  messages: Message[];
  unread_count: number;
}

// Promotion Types
export interface Promotion {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
}

// Client Dashboard Types
export interface DashboardStats {
  total_players: number;
  active_players: number;
  total_games: number;
  pending_claims: number;
}

// Community Types
export interface CommunityPost {
  id: number;
  content: string;
  image_url?: string;
  author_id: number;
  author_username: string;
  author_full_name?: string;
  author_profile_picture?: string;
  author_user_type: string;
  likes_count: number;
  comments_count: number;
  is_liked_by_me: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostComment {
  id: number;
  content: string;
  post_id: number;
  author_id: number;
  author_username: string;
  author_full_name?: string;
  author_profile_picture?: string;
  created_at: string;
}

// Referral Types
export interface ReferralCode {
  code: string;
  created_at: string;
}

export interface ReferralStats {
  total_referrals: number;
  completed_referrals: number;
  pending_referrals: number;
  total_credits_earned: number;
}

export interface Referral {
  id: number;
  referred_user_id: number;
  referred_username: string;
  referred_full_name?: string;
  referred_profile_picture?: string;
  status: 'pending' | 'completed' | 'expired';
  bonus_amount: number;
  created_at: string;
  completed_at?: string;
}

// Broadcast Types
export interface Broadcast {
  id: number;
  title: string;
  content: string;
  broadcast_type: 'announcement' | 'promotion' | 'maintenance' | 'update';
  priority: 'low' | 'medium' | 'high';
  is_read: boolean;
  created_at: string;
  expires_at?: string;
  sender_id?: number;
  sender_username?: string;
}

// Ticket/Support Types
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

// Review Types
export interface Review {
  id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  title: string;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected' | 'disputed';
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
  reviewer: {
    id: number;
    username: string;
    full_name?: string;
    profile_picture?: string;
    user_type: string;
  };
  reviewee: {
    id: number;
    username: string;
    full_name?: string;
    profile_picture?: string;
    user_type: string;
  };
}

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_distribution: { [key: number]: number };
}

export interface ReviewCreate {
  reviewee_id: number;
  rating: number;
  title: string;
  comment?: string;
}

// Report Types
export type ReportStatus = 'pending' | 'investigating' | 'warning' | 'resolved' | 'valid' | 'invalid' | 'malicious';

export interface Report {
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
  action_taken?: string;
  warning_sent_at?: string;
  warning_deadline?: string;
  resolution_amount?: number;
  resolution_notes?: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface ReportCreate {
  reported_user_id: number;
  reason: string;
  evidence?: string;
}

// Game Credential Types
export interface GameCredential {
  id: number;
  player_id: number;
  game_id: number;
  game_name: string;
  game_display_name: string;
  game_username: string;
  game_password: string;
  created_by_client_id: number;
  login_url?: string;
  created_at: string;
  updated_at: string;
}

// Notification Types
export type NotificationCategory =
  | 'message'
  | 'credit_transfer'
  | 'friend_request'
  | 'promotion'
  | 'broadcast'
  | 'claim'
  | 'system';

export interface NotificationData {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: Date;
  isRead: boolean;
}

export interface NotificationSettings {
  push_notifications: boolean;
  notification_sounds: boolean;
  messages: boolean;
  promotions: boolean;
  broadcasts: boolean;
  credits: boolean;
}

// Crypto Purchase Types
export type CryptoType = 'BTC' | 'ETH' | 'USDT' | 'USDC';
export type PurchaseStatus = 'pending' | 'confirmed' | 'rejected' | 'expired';

export interface CryptoWallet {
  crypto_type: CryptoType;
  wallet_address: string;
  network?: string; // e.g., "ERC20", "TRC20", "BEP20" for USDT
  is_active: boolean;
}

export interface CreditRate {
  credits_per_dollar: number;
  min_purchase: number;
  max_purchase: number;
}

export interface CryptoPurchase {
  id: number;
  client_id: number;
  reference_code: string;
  crypto_type: CryptoType;
  crypto_amount: string;
  usd_amount: number;
  credits_amount: number;
  wallet_address: string;
  tx_hash?: string;
  status: PurchaseStatus;
  admin_notes?: string;
  created_at: string;
  confirmed_at?: string;
  expires_at: string;
}

export interface CreatePurchaseRequest {
  crypto_type: CryptoType;
  usd_amount: number;
}

// API Response Types
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}
