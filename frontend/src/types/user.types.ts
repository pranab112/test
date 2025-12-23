import { UserType } from './auth.types';

export interface UserResponse {
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
}
