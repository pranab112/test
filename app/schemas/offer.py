from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.enums import OfferType, OfferStatus, OfferClaimStatus

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
