from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.enums import UserType

class PlayerCreateByClient(BaseModel):
    username: str
    full_name: str
    password: Optional[str] = None
    referral_code: Optional[str] = None  # Optional referral code for bonus credits

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

class UserSearchResponse(BaseModel):
    users: List[UserResponse]


class ProfileUpdate(BaseModel):
    """Schema for updating user profile"""
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
