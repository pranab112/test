// Auth
export * from './auth.api';

// Admin API - prefix conflicting types
export {
  adminApi,
  type DashboardStats,
  type User,
  type UsersResponse,
  type PendingApprovalsResponse,
  type Promotion as AdminPromotion,
  type PromotionsResponse,
  type Report as AdminReport,
  type ReportsResponse,
  type Review as AdminReview,
  type ReviewsResponse,
  type Message as AdminMessage,
  type MessagesResponse,
} from './admin.api';

// Client API - prefix conflicting types
export {
  clientApi,
  type PlayerStats,
  type PlayerCreateRequest,
  type PlayerRegistrationResponse,
  type BulkPlayerCreate,
  type BulkRegistrationResponse,
  type Player,
  type ActivityItem,
  type RecentActivityResponse,
  type Game as ClientApiGame,
  type ClientGameWithDetails,
  type ClientGamesWithDetailsResponse,
  type ClientGameUpdateRequest,
} from './client.api';

// Chat API
export {
  chatApi,
  type Message,
  type MessageResponse,
  type Friend,
  type Conversation,
  type MessageListResponse,
  type SendMessageRequest,
  type ChatStats,
} from './chat.api';

// Friends API
export {
  friendsApi,
  type Friend as FriendDetails,
  type FriendRequest,
} from './friends.api';

// Promotions API
export * from './promotions.api';

// Reviews API
export * from './reviews.api';

// Reports API
export * from './reports.api';

// Games API
export {
  gamesApi,
  type Game,
  type CreateGameRequest,
  type UpdateGameRequest,
  type ClientGame,
} from './games.api';

// Settings API
export {
  settingsApi,
  type ProfileUpdateRequest,
  type NotificationSettings,
  type TwoFactorStatus,
  type TwoFactorSetupResponse,
  type EmailVerificationStatus,
  type ActiveSession,
} from './settings.api';
