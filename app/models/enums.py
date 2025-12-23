import enum

class UserType(str, enum.Enum):
    CLIENT = "client"
    PLAYER = "player"
    ADMIN = "admin"

class FriendRequestStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class MessageType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    VOICE = "voice"
    PROMOTION = "promotion"

class PromotionType(str, enum.Enum):
    BONUS = "bonus"
    CASHBACK = "cashback"
    FREE_SPINS = "free_spins"
    CREDITS = "credits"
    DEPOSIT_BONUS = "deposit_bonus"

class PromotionStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    DEPLETED = "depleted"
    CANCELLED = "cancelled"

class ClaimStatus(str, enum.Enum):
    CLAIMED = "claimed"
    USED = "used"
    EXPIRED = "expired"

class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"

class OfferType(str, enum.Enum):
    EMAIL_VERIFICATION = "email_verification"
    PROFILE_COMPLETION = "profile_completion"
    FIRST_DEPOSIT = "first_deposit"
    REFERRAL = "referral"
    LOYALTY = "loyalty"
    SPECIAL_EVENT = "special_event"

class OfferStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"

class OfferClaimStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
