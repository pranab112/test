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
    ReviewListResponse,
    ReviewStatsResponse
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
    GameCredentialCreate,
    GameCredentialUpdate,
    GameCredentialResponse,
    GameCredentialListResponse
)
from app.schemas.payment import (
    PaymentMethodBase,
    PaymentMethodCreate,
    PaymentMethodResponse,
    ClientPaymentMethodUpdate,
    ClientPaymentMethodResponse,
    ClientPaymentMethodsResponse
)
from app.schemas.report import (
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    ReportListResponse
)
from app.schemas.offer import (
    PlatformOfferCreate,
    PlatformOfferUpdate,
    PlatformOfferResponse,
    OfferClaimCreate,
    OfferClaimResponse,
    OfferClaimProcess
)
from app.schemas.email import (
    EmailVerificationRequest,
    EmailVerificationResponse,
    VerifyEmailRequest,
    EmailStatusResponse,
    OTPVerificationRequest
)
from app.schemas.activity import ActivityItem, RecentActivityResponse

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
    "ReviewListResponse",
    "ReviewStatsResponse",
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
    "GameCredentialCreate",
    "GameCredentialUpdate",
    "GameCredentialResponse",
    "GameCredentialListResponse",
    # Payment
    "PaymentMethodBase",
    "PaymentMethodCreate",
    "PaymentMethodResponse",
    "ClientPaymentMethodUpdate",
    "ClientPaymentMethodResponse",
    "ClientPaymentMethodsResponse",
    # Report
    "ReportCreate",
    "ReportUpdate",
    "ReportResponse",
    "ReportListResponse",
    # Offer
    "PlatformOfferCreate",
    "PlatformOfferUpdate",
    "PlatformOfferResponse",
    "OfferClaimCreate",
    "OfferClaimResponse",
    "OfferClaimProcess",
    # Email
    "EmailVerificationRequest",
    "EmailVerificationResponse",
    "VerifyEmailRequest",
    "EmailStatusResponse",
    "OTPVerificationRequest",
    # Activity
    "ActivityItem",
    "RecentActivityResponse",
]
