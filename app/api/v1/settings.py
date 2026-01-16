"""
User settings API endpoints
Handles notification preferences and other user settings
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import uuid

from app.database import get_db
from app.models.user import User
from app.api.v1.auth import get_current_user
from app import schemas

router = APIRouter(prefix="/settings")


class NotificationSettingsResponse(BaseModel):
    notification_sounds: bool

    class Config:
        from_attributes = True


class NotificationSettingsUpdate(BaseModel):
    notification_sounds: Optional[bool] = None


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    company_name: Optional[str] = None


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
    if settings.notification_sounds is not None:
        current_user.notification_sounds = settings.notification_sounds
    db.commit()
    db.refresh(current_user)

    return NotificationSettingsResponse(
        notification_sounds=current_user.notification_sounds if current_user.notification_sounds is not None else True
    )


@router.get("/profile", response_model=schemas.UserResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile"""
    return current_user


@router.put("/profile", response_model=schemas.UserResponse)
async def update_profile(
    profile_data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name

    if profile_data.company_name is not None:
        current_user.company_name = profile_data.company_name

    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload profile picture"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed."
        )

    # Create upload directory if it doesn't exist
    upload_dir = "uploads/profile_pictures"
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = os.path.join(upload_dir, filename)

    # Save file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Update user profile picture
    current_user.profile_picture = f"/{file_path}"
    db.commit()

    return {"profile_picture": current_user.profile_picture}


@router.delete("/profile-picture")
async def delete_profile_picture(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete profile picture"""
    if current_user.profile_picture:
        # Try to delete the file
        file_path = current_user.profile_picture.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)

    current_user.profile_picture = None
    db.commit()

    return {"message": "Profile picture deleted"}
