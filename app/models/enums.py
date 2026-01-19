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
    GC_BONUS = "gc_bonus"  # Game Credits bonus - the only promotion type

class PromotionStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    DEPLETED = "depleted"
    CANCELLED = "cancelled"

class ClaimStatus(str, enum.Enum):
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    CLAIMED = "claimed"
    USED = "used"
    EXPIRED = "expired"

class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    INVESTIGATING = "investigating"
    WARNING = "warning"  # 4-day grace period - user must resolve (pay/refund)
    RESOLVED = "resolved"  # User resolved within grace period
    VALID = "valid"  # Report confirmed valid (either after warning expired or immediately)
    INVALID = "invalid"
    MALICIOUS = "malicious"  # False report made to harm someone


class ReviewStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DISPUTED = "disputed"  # Under appeal

class OfferType(str, enum.Enum):
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


class TicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_USER = "waiting_user"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketCategory(str, enum.Enum):
    ACCOUNT = "account"
    PAYMENT = "payment"
    TECHNICAL = "technical"
    PROMOTION = "promotion"
    REPORT_USER = "report_user"
    FEEDBACK = "feedback"
    APPEAL_REVIEW = "appeal_review"  # Dispute a review
    APPEAL_REPORT = "appeal_report"  # Dispute a report against you
    OTHER = "other"


class ReferralStatus(str, enum.Enum):
    PENDING = "pending"  # Referred user registered but not yet approved
    COMPLETED = "completed"  # Referred user approved, bonus credited
    EXPIRED = "expired"  # Referred user never completed registration


class GameType(str, enum.Enum):
    LUCKY_DICE = "lucky_dice"
    LUCKY_SLOTS = "lucky_slots"


class BetResult(str, enum.Enum):
    WIN = "win"
    LOSE = "lose"
    JACKPOT = "jackpot"
