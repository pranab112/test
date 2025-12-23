from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.enums import MessageType
from app.schemas.user import UserResponse

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
