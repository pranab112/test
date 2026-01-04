from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.enums import ReferralStatus


class ReferralCodeResponse(BaseModel):
    """Response for getting/generating referral code"""
    referral_code: str
    referral_link: str


class ReferralStatsResponse(BaseModel):
    """Statistics about a user's referrals"""
    total_referrals: int
    completed_referrals: int
    pending_referrals: int
    total_credits_earned: int
    referral_code: Optional[str] = None


class ReferredUserInfo(BaseModel):
    """Info about a referred user"""
    id: int
    username: str
    full_name: Optional[str] = None
    status: ReferralStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    bonus_amount: int

    class Config:
        from_attributes = True


class ReferralListResponse(BaseModel):
    """List of all referrals made by the user"""
    referrals: List[ReferredUserInfo]
    total_count: int
    total_credits_earned: int


class ReferralResponse(BaseModel):
    """Response for a single referral"""
    id: int
    referrer_id: int
    referred_id: int
    status: ReferralStatus
    bonus_amount: int
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApplyReferralRequest(BaseModel):
    """Request to apply a referral code during registration"""
    referral_code: str
