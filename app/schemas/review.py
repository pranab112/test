from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum
from app.schemas.user import UserResponse


class ReviewStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DISPUTED = "disputed"


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
    status: str
    admin_notes: Optional[str] = None
    appeal_ticket_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime]
    reviewer: UserResponse
    reviewee: UserResponse

    class Config:
        from_attributes = True


class ReviewDetailResponse(BaseModel):
    """Detailed review response including moderation info (for admin)"""
    id: int
    reviewer_id: int
    reviewee_id: int
    rating: int
    title: str
    comment: Optional[str]
    status: str
    admin_notes: Optional[str]
    moderated_by: Optional[int]
    moderated_at: Optional[datetime]
    appeal_ticket_id: Optional[int]
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


class ReviewModerationListResponse(BaseModel):
    """List response for admin review moderation"""
    reviews: List[ReviewDetailResponse]
    total_count: int
    pending_count: int
    approved_count: int
    rejected_count: int
    disputed_count: int


class ReviewStatsResponse(BaseModel):
    total_reviews: int
    average_rating: float
    rating_distribution: Dict[int, int]  # {1: count, 2: count, ...}


# Admin moderation schemas
class ReviewModerateRequest(BaseModel):
    """Request to approve or reject a review"""
    action: str = Field(..., description="Action: 'approve' or 'reject'")
    admin_notes: Optional[str] = Field(None, max_length=1000, description="Reason for rejection or notes")


class ReviewModerationResponse(BaseModel):
    """Response after moderation action"""
    message: str
    review_id: int
    new_status: str
    admin_notes: Optional[str]


# Appeal schemas
class ReviewAppealCreate(BaseModel):
    """Create an appeal for a rejected review"""
    review_id: int
    reason: str = Field(..., min_length=10, max_length=2000, description="Reason for appeal")
