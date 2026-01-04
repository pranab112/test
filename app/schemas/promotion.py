from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from app.models.enums import PromotionType, PromotionStatus

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
    value: Optional[int] = None
    max_claims_per_player: Optional[int] = None
    total_budget: Optional[int] = None
    min_player_level: Optional[int] = None
    end_date: Optional[datetime] = None
    terms: Optional[str] = None
    wagering_requirement: Optional[int] = None
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
    status: Optional[str] = None  # pending_approval, approved, rejected, claimed

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
