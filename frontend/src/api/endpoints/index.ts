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
  type PaymentMethod,
  type PlayerPaymentPreferences,
} from './settings.api';

// Game Credentials API
export {
  gameCredentialsApi,
  type GameCredential,
  type GameCredentialListResponse,
  type CreateGameCredentialRequest,
  type UpdateGameCredentialRequest,
} from './gameCredentials.api';

// Offers API
export {
  offersApi,
  type PlatformOffer,
  type OfferClaim,
  type OfferType,
  type OfferStatus,
  type OfferClaimStatus,
  type CreateOfferRequest,
  type UpdateOfferRequest,
  type ClaimOfferRequest,
  type ProcessClaimRequest,
} from './offers.api';

// Referrals API
export {
  referralsApi,
  type ReferralCodeResponse,
  type ReferralStats,
  type ReferredUser,
  type ReferralListResponse,
  type ReferralBonusInfo,
} from './referrals.api';

// Tickets API
export { ticketsApi } from './tickets.api';
