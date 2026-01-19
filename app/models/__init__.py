# Import Base first to avoid circular imports
from app.models.base import Base

# Import enums
from app.models.enums import (
    UserType,
    FriendRequestStatus,
    MessageType,
    PromotionType,
    PromotionStatus,
    ClaimStatus,
    ReportStatus,
    ReviewStatus,
    OfferType,
    OfferStatus,
    OfferClaimStatus,
    TicketStatus,
    TicketPriority,
    TicketCategory,
    ReferralStatus,
    GameType,
    BetResult
)

# Import models - order matters for relationships
from app.models.user import User, friends_association
from app.models.friend import FriendRequest
from app.models.message import Message
from app.models.review import Review
from app.models.promotion import Promotion, PromotionClaim
from app.models.game import Game, ClientGame, GameCredentials
from app.models.wallet import PlayerWallet
from app.models.payment import PaymentMethod, ClientPaymentMethod, PlayerPaymentPreference
from app.models.report import Report
from app.models.offer import PlatformOffer, OfferClaim
from app.models.ticket import Ticket, TicketMessage
from app.models.referral import Referral, REFERRAL_BONUS_CREDITS
from app.models.bet_transaction import BetTransaction
from app.models.community import CommunityPost, PostComment, PostLike, PostVisibility
from app.models.crypto import AdminCryptoWallet, CreditPurchaseRequest, DEFAULT_CREDIT_RATES
from app.models.push_token import PushToken, DevicePlatform

__all__ = [
    # Base
    "Base",
    # Enums
    "UserType",
    "FriendRequestStatus",
    "MessageType",
    "PromotionType",
    "PromotionStatus",
    "ClaimStatus",
    "ReportStatus",
    "ReviewStatus",
    "OfferType",
    "OfferStatus",
    "OfferClaimStatus",
    "TicketStatus",
    "TicketPriority",
    "TicketCategory",
    "ReferralStatus",
    "GameType",
    "BetResult",
    # Models
    "User",
    "friends_association",
    "FriendRequest",
    "Message",
    "Review",
    "Promotion",
    "PromotionClaim",
    "Game",
    "ClientGame",
    "GameCredentials",
    "PlayerWallet",
    "PaymentMethod",
    "ClientPaymentMethod",
    "PlayerPaymentPreference",
    "Report",
    "PlatformOffer",
    "OfferClaim",
    "Ticket",
    "TicketMessage",
    "Referral",
    "REFERRAL_BONUS_CREDITS",
    "BetTransaction",
    "CommunityPost",
    "PostComment",
    "PostLike",
    "PostVisibility",
    "AdminCryptoWallet",
    "CreditPurchaseRequest",
    "DEFAULT_CREDIT_RATES",
    "PushToken",
    "DevicePlatform",
]
