from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum
from app.models import UserType, FriendRequestStatus, MessageType

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    user_type: UserType

class UserCreate(UserBase):
    password: str
    company_name: Optional[str] = None  # For clients
    client_identifier: Optional[str] = None  # For players - username or company of their client

class PlayerCreateByClient(BaseModel):
    username: str
    full_name: str
    password: Optional[str] = None

class UserResponse(BaseModel):
    """Response model for user data - email is optional for client-created players"""
    id: int
    user_id: str
    email: Optional[str] = None  # Optional - client-created players don't have email
    username: str
    full_name: Optional[str] = None
    user_type: UserType
    is_active: bool
    created_at: datetime
    company_name: Optional[str] = None
    player_level: Optional[int] = None
    credits: Optional[int] = None
    profile_picture: Optional[str] = None
    is_online: Optional[bool] = False
    last_seen: Optional[datetime] = None
    last_activity: Optional[datetime] = None
    secondary_email: Optional[str] = None
    is_email_verified: Optional[bool] = False

    class Config:
        from_attributes = True

class PlayerRegistrationResponse(UserResponse):
    temp_password: Optional[str] = None  # Only included when client creates player

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_type: UserType

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    user_type: Optional[UserType] = None

class FriendRequestCreate(BaseModel):
    receiver_user_id: str

class FriendRequestResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    status: FriendRequestStatus
    created_at: datetime
    sender: UserResponse
    receiver: UserResponse

    class Config:
        from_attributes = True

class FriendRequestUpdate(BaseModel):
    status: FriendRequestStatus

class UserSearchResponse(BaseModel):
    users: List[UserResponse]

class FriendsListResponse(BaseModel):
    friends: List[UserResponse]

# Message Schemas
class MessageBase(BaseModel):
    message_type: MessageType
    content: Optional[str] = None

class MessageCreate(MessageBase):
    receiver_id: int

class MessageResponse(MessageBase):
    id: int
    sender_id: int
    receiver_id: int
    sender: UserResponse
    receiver: UserResponse
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    duration: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class MessageListResponse(BaseModel):
    messages: List[MessageResponse]
    unread_count: int

class ConversationResponse(BaseModel):
    friend: UserResponse
    last_message: Optional[MessageResponse] = None
    unread_count: int

class ConversationsListResponse(BaseModel):
    conversations: List[ConversationResponse]

# Review Schemas
class ReviewCreate(BaseModel):
    reviewee_id: int
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    title: str = Field(..., min_length=1, max_length=200)
    comment: Optional[str] = None

class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    reviewer_id: int
    reviewee_id: int
    rating: int
    title: str
    comment: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    reviewer: UserResponse
    reviewee: UserResponse

    class Config:
        from_attributes = True

class ReviewListResponse(BaseModel):
    reviews: List[ReviewResponse]
    total_count: int
    average_rating: Optional[float]

class ReviewStatsResponse(BaseModel):
    total_reviews: int
    average_rating: float
    rating_distribution: Dict[int, int]  # {1: count, 2: count, ...}


# Promotion Schemas
class PromotionType(str, Enum):
    BONUS = "bonus"
    CASHBACK = "cashback"
    FREE_SPINS = "free_spins"
    CREDITS = "credits"
    DEPOSIT_BONUS = "deposit_bonus"


class PromotionStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    DEPLETED = "depleted"
    CANCELLED = "cancelled"


class PromotionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    promotion_type: PromotionType
    value: int  # Amount or percentage
    max_claims_per_player: int = 1
    total_budget: Optional[int] = None
    min_player_level: int = 1
    end_date: datetime
    target_player_ids: Optional[List[int]] = None  # None means all players
    terms: Optional[str] = None
    wagering_requirement: int = 1


class PromotionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    max_claims_per_player: Optional[int] = None
    total_budget: Optional[int] = None
    end_date: Optional[datetime] = None
    terms: Optional[str] = None
    status: Optional[PromotionStatus] = None


class PromotionResponse(BaseModel):
    id: int
    client_id: int
    client_name: str
    client_company: Optional[str]
    title: str
    description: Optional[str]
    promotion_type: PromotionType
    value: int
    max_claims_per_player: int
    total_budget: Optional[int]
    used_budget: int
    min_player_level: int
    start_date: datetime
    end_date: datetime
    status: PromotionStatus
    terms: Optional[str]
    wagering_requirement: int
    claims_count: int
    created_at: datetime
    can_claim: bool = False
    already_claimed: bool = False

    class Config:
        from_attributes = True


class PromotionClaimRequest(BaseModel):
    promotion_id: int


class PromotionClaimResponse(BaseModel):
    success: bool
    message: str
    claim_id: Optional[int] = None
    claimed_value: Optional[int] = None
    new_balance: Optional[int] = None
    wagering_required: Optional[int] = None


class PlayerWalletResponse(BaseModel):
    player_id: int
    main_balance: int
    bonus_balances: Dict[str, Dict[str, int]]  # {"client_id": {"bonus": amount, "wagering": amount}}
    total_wagering: int
    last_updated: datetime

    class Config:
        from_attributes = True


class PromotionStatsResponse(BaseModel):
    promotion_id: int
    title: str
    total_claims: int
    unique_players: int
    total_value_claimed: int
    remaining_budget: Optional[int]
    claim_rate: float  # percentage
    avg_claim_value: float
    status: PromotionStatus


# Payment Method Schemas
class PaymentMethodBase(BaseModel):
    name: str
    display_name: str
    icon_url: Optional[str] = None
    is_active: bool = True


class PaymentMethodCreate(PaymentMethodBase):
    pass


class PaymentMethodResponse(PaymentMethodBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ClientPaymentMethodUpdate(BaseModel):
    payment_method_ids: List[int]


class ClientPaymentMethodResponse(BaseModel):
    id: int
    payment_method: PaymentMethodResponse
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ClientPaymentMethodsResponse(BaseModel):
    accepted_methods: List[PaymentMethodResponse]


class GameResponse(BaseModel):
    id: int
    name: str
    display_name: str
    icon_url: Optional[str] = None
    category: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class GameCreate(BaseModel):
    name: str
    display_name: str
    icon_url: Optional[str] = None
    category: Optional[str] = None
    is_active: bool = True

class GameUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    icon_url: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class BulkGameCreate(BaseModel):
    games: List[GameCreate]


class ClientGameUpdate(BaseModel):
    game_ids: List[int]


class ClientGameResponse(BaseModel):
    id: int
    game: GameResponse
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ClientGamesResponse(BaseModel):
    available_games: List[GameResponse]


# Email Verification Schemas
class EmailVerificationRequest(BaseModel):
    email: EmailStr

class EmailVerificationResponse(BaseModel):
    message: str
    verification_sent: bool

class VerifyEmailRequest(BaseModel):
    token: str

class EmailStatusResponse(BaseModel):
    secondary_email: Optional[str] = None
    is_email_verified: bool = False
    verification_pending: bool = False

class OTPVerificationRequest(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]{6}$")


# Game Credentials Schemas
class GameCredentialCreate(BaseModel):
    player_id: int
    game_id: int
    game_username: str
    game_password: str

class GameCredentialUpdate(BaseModel):
    game_username: str
    game_password: str

class GameCredentialResponse(BaseModel):
    id: int
    player_id: int
    game_id: int
    game_name: str
    game_display_name: str
    game_username: str
    game_password: str
    created_by_client_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class GameCredentialListResponse(BaseModel):
    credentials: List[GameCredentialResponse]


# Report Schemas
from app.models import ReportStatus

class ReportCreate(BaseModel):
    reported_user_id: int
    reason: str

class ReportUpdate(BaseModel):
    reason: str

class ReportResponse(BaseModel):
    id: int
    reporter_id: int
    reported_user_id: int
    reporter_name: str
    reporter_username: str
    reported_user_name: str
    reported_user_username: str
    reason: str
    status: ReportStatus
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class ReportListResponse(BaseModel):
    reports_made: List[ReportResponse]
    reports_received: List[ReportResponse]

# Recent Activity Schemas
class ActivityItem(BaseModel):
    activity_type: str  # "friend_request", "player_registered", "message_received", etc.
    description: str
    user: str  # Username or full name
    timestamp: datetime
    status: Optional[str] = None  # For friend requests: "Pending", "Accepted", etc.

    class Config:
        from_attributes = True

class RecentActivityResponse(BaseModel):
    activities: List[ActivityItem]

# Platform Offers Schemas
from app.models import OfferType, OfferStatus, OfferClaimStatus

class PlatformOfferCreate(BaseModel):
    title: str
    description: str
    offer_type: OfferType
    bonus_amount: int
    requirement_description: Optional[str] = None
    max_claims: Optional[int] = None
    max_claims_per_player: int = 1
    end_date: Optional[datetime] = None

class PlatformOfferUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    bonus_amount: Optional[int] = None
    requirement_description: Optional[str] = None
    max_claims: Optional[int] = None
    max_claims_per_player: Optional[int] = None
    status: Optional[OfferStatus] = None
    end_date: Optional[datetime] = None

class PlatformOfferResponse(BaseModel):
    id: int
    title: str
    description: str
    offer_type: OfferType
    bonus_amount: int
    requirement_description: Optional[str]
    max_claims: Optional[int]
    max_claims_per_player: int
    status: OfferStatus
    start_date: datetime
    end_date: Optional[datetime]
    created_at: datetime
    total_claims: Optional[int] = 0  # Computed field

    class Config:
        from_attributes = True

class OfferClaimCreate(BaseModel):
    offer_id: int
    client_id: int
    verification_data: Optional[str] = None  # e.g., email for email verification offer

class OfferClaimResponse(BaseModel):
    id: int
    offer_id: int
    player_id: int
    client_id: int
    status: OfferClaimStatus
    bonus_amount: int
    verification_data: Optional[str]
    claimed_at: datetime
    processed_at: Optional[datetime]

    # Nested info
    offer_title: Optional[str] = None
    client_name: Optional[str] = None
    player_name: Optional[str] = None

    class Config:
        from_attributes = True

class OfferClaimProcess(BaseModel):
    status: OfferClaimStatus  # approved, rejected, completed


# Password Management Schemas
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=72)

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password is too long (max 72 bytes in UTF-8)')
        return v


class AdminResetPasswordRequest(BaseModel):
    new_password: Optional[str] = Field(None, min_length=6, max_length=72)
    generate_random: bool = False  # If true, generate a random password

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        if v and len(v.encode('utf-8')) > 72:
            raise ValueError('Password is too long (max 72 bytes in UTF-8)')
        return v


class PasswordResetResponse(BaseModel):
    message: str
    temp_password: Optional[str] = None  # Only included when random password is generated