"""
User settings API endpoints
Handles notification preferences and other user settings
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/settings")


class NotificationSettingsResponse(BaseModel):
    notification_sounds: bool

    class Config:
        from_attributes = True


class NotificationSettingsUpdate(BaseModel):
    notification_sounds: bool


@router.get("/notifications", response_model=NotificationSettingsResponse)
async def get_notification_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's notification settings"""
    return NotificationSettingsResponse(
        notification_sounds=current_user.notification_sounds if current_user.notification_sounds is not None else True
    )


@router.put("/notifications", response_model=NotificationSettingsResponse)
async def update_notification_settings(
    settings: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's notification settings"""
    current_user.notification_sounds = settings.notification_sounds
    db.commit()
    db.refresh(current_user)

    return NotificationSettingsResponse(
        notification_sounds=current_user.notification_sounds
    )
