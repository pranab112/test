"""
Push Notification Endpoints
Handles registration and management of push notification tokens.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app import models, auth
from app.database import get_db
from app.models.push_token import DevicePlatform

router = APIRouter(prefix="/notifications", tags=["notifications"])


class RegisterTokenRequest(BaseModel):
    token: str
    platform: str  # "ios", "android", "web"
    device_type: Optional[str] = None


class RegisterTokenResponse(BaseModel):
    success: bool
    message: str


class NotificationPreferences(BaseModel):
    promotions_enabled: bool = True
    messages_enabled: bool = True
    credits_enabled: bool = True
    broadcasts_enabled: bool = True


@router.post("/register-token", response_model=RegisterTokenResponse)
async def register_push_token(
    request: RegisterTokenRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Register a device push token for push notifications.
    This endpoint is called by the mobile app after obtaining an Expo push token.
    """
    # Validate token format
    if not request.token or not request.token.startswith("ExponentPushToken"):
        raise HTTPException(
            status_code=400,
            detail="Invalid push token format. Must be an Expo push token."
        )

    # Parse platform
    platform_map = {
        "ios": DevicePlatform.IOS,
        "android": DevicePlatform.ANDROID,
        "web": DevicePlatform.WEB,
    }
    platform = platform_map.get(request.platform.lower())
    if not platform:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platform. Must be one of: ios, android, web"
        )

    # Check if token already exists
    existing_token = db.query(models.PushToken).filter(
        models.PushToken.token == request.token
    ).first()

    if existing_token:
        # Update existing token (might be re-registering from different account)
        if existing_token.user_id != current_user.id:
            # Token is being transferred to a new user (user logged out and new user logged in)
            existing_token.user_id = current_user.id

        existing_token.platform = platform
        existing_token.device_type = request.device_type
        existing_token.is_active = True
        existing_token.last_used_at = datetime.now(timezone.utc)
        db.commit()

        return RegisterTokenResponse(
            success=True,
            message="Push token updated successfully"
        )

    # Create new token
    new_token = models.PushToken(
        user_id=current_user.id,
        token=request.token,
        platform=platform,
        device_type=request.device_type,
        is_active=True,
    )

    db.add(new_token)
    db.commit()

    return RegisterTokenResponse(
        success=True,
        message="Push token registered successfully"
    )


@router.delete("/unregister-token")
async def unregister_push_token(
    token: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Unregister a push token (e.g., when user logs out).
    """
    existing_token = db.query(models.PushToken).filter(
        models.PushToken.token == token,
        models.PushToken.user_id == current_user.id
    ).first()

    if existing_token:
        # Deactivate instead of delete to handle re-registration
        existing_token.is_active = False
        db.commit()

    return {"success": True, "message": "Push token unregistered"}


@router.get("/tokens")
async def get_my_tokens(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all registered push tokens for the current user.
    Useful for debugging.
    """
    tokens = db.query(models.PushToken).filter(
        models.PushToken.user_id == current_user.id
    ).all()

    return {
        "tokens": [
            {
                "id": t.id,
                "token": t.token[:30] + "...",  # Truncate for security
                "platform": t.platform.value,
                "device_type": t.device_type,
                "is_active": t.is_active,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "last_used_at": t.last_used_at.isoformat() if t.last_used_at else None,
            }
            for t in tokens
        ]
    }


@router.post("/test")
async def test_push_notification(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Send a test push notification to all of the user's registered devices.
    """
    from app.services.push_notification_service import push_service

    tokens = db.query(models.PushToken).filter(
        models.PushToken.user_id == current_user.id,
        models.PushToken.is_active == True
    ).all()

    if not tokens:
        raise HTTPException(
            status_code=404,
            detail="No registered push tokens found. Please enable notifications in the app first."
        )

    success_count = 0
    for token in tokens:
        result = await push_service.send_notification(
            token=token.token,
            title="Test Notification",
            body="This is a test notification from GoldenAce!",
            data={"test": True},
            category="system",
            channel_id="default",
        )
        if result:
            success_count += 1

    return {
        "success": True,
        "message": f"Test notification sent to {success_count}/{len(tokens)} devices"
    }
