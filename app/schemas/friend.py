from pydantic import BaseModel
from typing import List
from datetime import datetime
from app.models.enums import FriendRequestStatus
from app.schemas.user import UserResponse

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

class FriendsListResponse(BaseModel):
    friends: List[UserResponse]

    class Config:
        from_attributes = True
