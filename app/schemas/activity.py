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


class TrendData(BaseModel):
    value: str
    is_positive: bool


class QuickStats(BaseModel):
    response_rate: float
    player_retention: float
    avg_rating: float


class PromotionStats(BaseModel):
    name: str
    claims: int
    rate: float


class AnalyticsResponse(BaseModel):
    total_friends: int
    total_messages: int
    active_players: int
    new_signups: int
    avg_session_time: str
    friends_trend: TrendData
    messages_trend: TrendData
    players_trend: TrendData
    signups_trend: TrendData
    session_time_trend: TrendData
    quick_stats: QuickStats
    recent_activity: List[ActivityItem]
    top_promotions: List[PromotionStats]
