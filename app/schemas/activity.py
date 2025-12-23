from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ActivityItem(BaseModel):
    activity_type: str  # "friend_request", "player_registered", "message_received", etc.
    description: str
    user: str  # Username or full name
    timestamp: datetime
    status: Optional[str] = None  # For friend requests: "Pending", "Accepted", etc.

    class Config:
        from_attributes = True

class RecentActivityResponse(BaseModel):
    activities: List[ActivityItem]
