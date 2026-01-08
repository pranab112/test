from app.schemas.common import PaginatedResponse, SuccessResponse, ErrorResponse
from app.schemas.auth import UserBase, UserCreate, UserLogin, Token, TokenData
from app.schemas.user import (
    PlayerCreateByClient,
    UserResponse,
    PlayerRegistrationResponse,
    UserSearchResponse
)
from app.schemas.friend import (
    FriendRequestCreate,
    FriendRequestResponse,
    FriendRequestUpdate,
    FriendsListResponse
)
from app.schemas.message import (
    MessageBase,
    MessageCreate,
    MessageResponse,
    MessageListResponse,
    ConversationResponse,
    ConversationsListResponse
)
from app.schemas.review import (
    ReviewCreate,
    ReviewUpdate,
    ReviewResponse,
    ReviewDetailResponse,
    ReviewListResponse,
    ReviewModerationListResponse,
    ReviewStatsResponse,
    ReviewModerateRequest,
    ReviewModerationResponse,
    ReviewAppealCreate
)
from app.schemas.promotion import (
    PromotionCreate,
    PromotionUpdate,
    PromotionResponse,
    PromotionClaimRequest,
    PromotionClaimResponse,
    PromotionStatsResponse
)
from app.schemas.wallet import PlayerWalletResponse
from app.schemas.game import (
    GameResponse,
    ClientGameUpdate,
    ClientGameResponse,
    ClientGamesResponse,
    ClientGameWithDetailsResponse,
    ClientGamesWithDetailsResponse,
    ClientGameUpdateSingle,
    GameCredentialCreate,
    GameCredentialUpdate,
    GameCredentialResponse,
    GameCredentialListResponse,
    MiniGameBetRequest,
    MiniGameBetResponse
)
from app.schemas.payment import (
    PaymentMethodBase,
    PaymentMethodCreate,
    PaymentMethodResponse,
    ClientPaymentMethodUpdate,
    ClientPaymentMethodResponse,
    ClientPaymentMethodsResponse,
    PaymentMethodDetail,
    PlayerPaymentPreferencesUpdate,
    PlayerPaymentPreferencesResponse,
    PlayerPaymentPreferencesSummary
)
from app.schemas.report import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    ReportDetailResponse,
    ReportListResponse,
    ReportInvestigationListResponse,
    ReportInvestigateRequest,
    ReportInvestigationResponse,
    ReportAppealCreate,
    ReportResolutionRequest,
    ReportResolutionResponse,
    ReportWarningResponse
)
from app.schemas.offer import (
    PlatformOfferCreate,
    PlatformOfferUpdate,
    PlatformOfferResponse,
    OfferClaimCreate,
    OfferClaimResponse,
    OfferClaimProcess,
    CreditTransfer
)
from app.schemas.email import (
    EmailVerificationRequest,
    EmailVerificationResponse,
    VerifyEmailRequest,
    EmailStatusResponse,
    OTPVerificationRequest
)
from app.schemas.activity import ActivityItem, RecentActivityResponse, TrendData, QuickStats, PromotionStats, AnalyticsResponse
from app.schemas.password import (
    ChangePasswordRequest,
    AdminResetPasswordRequest,
    PasswordResetResponse
)
from app.schemas.ticket import (
    TicketCreate,
    TicketUpdate,
    TicketUserInfo,
    TicketMessageResponse,
    TicketResponse,
    TicketDetailResponse,
    TicketListResponse,
    TicketMessageCreate,
    TicketStatsResponse
)

__all__ = [
    # Common
    "PaginatedResponse",
    "SuccessResponse",
    "ErrorResponse",
    # Auth
    "UserBase",
    "UserCreate",
    "UserLogin",
    "Token",
    "TokenData",
    # User
    "PlayerCreateByClient",
    "UserResponse",
    "PlayerRegistrationResponse",
    "UserSearchResponse",
    # Friend
    "FriendRequestCreate",
    "FriendRequestResponse",
    "FriendRequestUpdate",
    "FriendsListResponse",
    # Message
    "MessageBase",
    "MessageCreate",
    "MessageResponse",
    "MessageListResponse",
    "ConversationResponse",
    "ConversationsListResponse",
    # Review
    "ReviewCreate",
    "ReviewUpdate",
    "ReviewResponse",
    "ReviewDetailResponse",
    "ReviewListResponse",
    "ReviewModerationListResponse",
    "ReviewStatsResponse",
    "ReviewModerateRequest",
    "ReviewModerationResponse",
    "ReviewAppealCreate",
    # Promotion
    "PromotionCreate",
    "PromotionUpdate",
    "PromotionResponse",
    "PromotionClaimRequest",
    "PromotionClaimResponse",
    "PromotionStatsResponse",
    # Wallet
    "PlayerWalletResponse",
    # Game
    "GameResponse",
    "ClientGameUpdate",
    "ClientGameResponse",
    "ClientGamesResponse",
    "ClientGameWithDetailsResponse",
    "ClientGamesWithDetailsResponse",
    "ClientGameUpdateSingle",
    "GameCredentialCreate",
    "GameCredentialUpdate",
    "GameCredentialResponse",
    "GameCredentialListResponse",
    "MiniGameBetRequest",
    "MiniGameBetResponse",
    # Payment
    "PaymentMethodBase",
    "PaymentMethodCreate",
    "PaymentMethodResponse",
    "ClientPaymentMethodUpdate",
    "ClientPaymentMethodResponse",
    "ClientPaymentMethodsResponse",
    "PaymentMethodDetail",
    "PlayerPaymentPreferencesUpdate",
    "PlayerPaymentPreferencesResponse",
    "PlayerPaymentPreferencesSummary",
    # Report
    "ReportCreate",
    "ReportUpdate",
    "ReportResponse",
    "ReportDetailResponse",
    "ReportListResponse",
    "ReportInvestigationListResponse",
    "ReportInvestigateRequest",
    "ReportInvestigationResponse",
    "ReportAppealCreate",
    "ReportResolutionRequest",
    "ReportResolutionResponse",
    "ReportWarningResponse",
    # Offer
    "PlatformOfferCreate",
    "PlatformOfferUpdate",
    "PlatformOfferResponse",
    "OfferClaimCreate",
    "OfferClaimResponse",
    "OfferClaimProcess",
    "CreditTransfer",
    # Email
    "EmailVerificationRequest",
    "EmailVerificationResponse",
    "VerifyEmailRequest",
    "EmailStatusResponse",
    "OTPVerificationRequest",
    # Activity
    "ActivityItem",
    "RecentActivityResponse",
    "TrendData",
    "QuickStats",
    "PromotionStats",
    "AnalyticsResponse",
    # Password
    "ChangePasswordRequest",
    "AdminResetPasswordRequest",
    "PasswordResetResponse",
    # Ticket
    "TicketCreate",
    "TicketUpdate",
    "TicketUserInfo",
    "TicketMessageResponse",
    "TicketResponse",
    "TicketDetailResponse",
    "TicketListResponse",
    "TicketMessageCreate",
    "TicketStatsResponse",
]
