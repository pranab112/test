export enum UserType {
  CLIENT = 'client',
  PLAYER = 'player',
  ADMIN = 'admin',
}

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
  client_identifier?: string;
  referral_code?: string;
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
  phone?: string;
  level?: number;
}
