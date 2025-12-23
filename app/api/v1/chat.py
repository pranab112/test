from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
import os
import shutil
from datetime import datetime
import uuid
import asyncio
import logging
from app import models, schemas, auth
from app.database import get_db
from app.websocket import manager
from app.s3_storage import s3_storage, save_upload_file_locally

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
os.makedirs(f"{UPLOAD_DIR}/images", exist_ok=True)
os.makedirs(f"{UPLOAD_DIR}/voice", exist_ok=True)

def check_friendship(user1_id: int, user2_id: int, db: Session) -> bool:
    """Check if two users are friends"""
    user1 = db.query(models.User).filter(models.User.id == user1_id).first()
    user2 = db.query(models.User).filter(models.User.id == user2_id).first()

    if not user1 or not user2:
        return False

    return user2 in user1.friends

@router.post("/send/text", response_model=schemas.MessageResponse)
async def send_text_message(
    receiver_id: int = Form(...),
    content: str = Form(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a text message to a friend"""

    # Check if they are friends
    if not check_friendship(current_user.id, receiver_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only send messages to friends"
        )

    # Create message
    message = models.Message(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        message_type=models.MessageType.TEXT,
        content=content
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    # Send WebSocket notification to receiver if online
    await manager.broadcast_to_user({
        "type": "new_message",
        "sender_id": current_user.id,
        "sender_name": current_user.username,
        "message_type": "text",
        "content": content,
        "timestamp": message.created_at.isoformat()
    }, receiver_id)

    return message

@router.post("/send/image", response_model=schemas.MessageResponse)
async def send_image_message(
    receiver_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send an image message to a friend"""

    # Check if they are friends
    if not check_friendship(current_user.id, receiver_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only send messages to friends"
        )

    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Allowed: JPEG, PNG, GIF, WebP"
        )

    # Save file (S3 or local fallback)
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"

    file_url = None
    if s3_storage.enabled:
        # Upload to S3
        try:
            file.file.seek(0)  # Reset file pointer
            file_url = s3_storage.upload_file(
                file.file,
                unique_filename,
                folder="uploads/images",
                content_type=file.content_type
            )
            if file_url:
                logger.info(f"Image uploaded to S3: {file_url}")
            else:
                raise Exception("S3 upload returned None")
        except Exception as e:
            logger.error(f"S3 upload failed: {e}, falling back to local storage")
            # Fallback to local if S3 fails
            file_path = f"{UPLOAD_DIR}/images/{unique_filename}"
            file.file.seek(0)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_url = f"/uploads/images/{unique_filename}"
    else:
        # Local filesystem (development/fallback)
        file_path = f"{UPLOAD_DIR}/images/{unique_filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_url = f"/uploads/images/{unique_filename}"
        logger.warning(f"Image saved locally (ephemeral): {file_url}")

    # Create message
    message = models.Message(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        message_type=models.MessageType.IMAGE,
        file_url=file_url,
        file_name=file.filename
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    # Send WebSocket notification to receiver if online
    await manager.broadcast_to_user({
        "type": "new_message",
        "sender_id": current_user.id,
        "sender_name": current_user.username,
        "message_type": "image",
        "file_url": message.file_url,
        "file_name": message.file_name,
        "timestamp": message.created_at.isoformat()
    }, receiver_id)

    return message

@router.post("/send/voice", response_model=schemas.MessageResponse)
async def send_voice_message(
    receiver_id: int = Form(...),
    duration: int = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a voice message to a friend"""

    # Check if they are friends
    if not check_friendship(current_user.id, receiver_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only send messages to friends"
        )

    # Validate file type
    allowed_types = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid audio format"
        )

    # Save file (S3 or local fallback)
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "webm"
    unique_filename = f"{uuid.uuid4()}.{file_extension}"

    file_url = None
    if s3_storage.enabled:
        # Upload to S3
        try:
            file.file.seek(0)  # Reset file pointer
            file_url = s3_storage.upload_file(
                file.file,
                unique_filename,
                folder="uploads/voice",
                content_type=file.content_type
            )
            if file_url:
                logger.info(f"Voice message uploaded to S3: {file_url}")
            else:
                raise Exception("S3 upload returned None")
        except Exception as e:
            logger.error(f"S3 upload failed: {e}, falling back to local storage")
            # Fallback to local if S3 fails
            file_path = f"{UPLOAD_DIR}/voice/{unique_filename}"
            file.file.seek(0)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_url = f"/uploads/voice/{unique_filename}"
    else:
        # Local filesystem (development/fallback)
        file_path = f"{UPLOAD_DIR}/voice/{unique_filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_url = f"/uploads/voice/{unique_filename}"
        logger.warning(f"Voice message saved locally (ephemeral): {file_url}")

    # Create message
    message = models.Message(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        message_type=models.MessageType.VOICE,
        file_url=file_url,
        file_name=file.filename,
        duration=duration
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    # Send WebSocket notification to receiver if online
    await manager.broadcast_to_user({
        "type": "new_message",
        "sender_id": current_user.id,
        "sender_name": current_user.username,
        "message_type": "voice",
        "file_url": message.file_url,
        "file_name": message.file_name,
        "duration": message.duration,
        "timestamp": message.created_at.isoformat()
    }, receiver_id)

    return message

@router.get("/conversations", response_model=List[schemas.ConversationResponse])
async def get_conversations(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all conversations with friends"""

    conversations = []

    for friend in current_user.friends:
        # Get last message
        last_message = db.query(models.Message).filter(
            or_(
                and_(models.Message.sender_id == current_user.id,
                     models.Message.receiver_id == friend.id),
                and_(models.Message.sender_id == friend.id,
                     models.Message.receiver_id == current_user.id)
            )
        ).order_by(models.Message.created_at.desc()).first()

        # Count unread messages
        unread_count = db.query(models.Message).filter(
            models.Message.sender_id == friend.id,
            models.Message.receiver_id == current_user.id,
            models.Message.is_read == False
        ).count()

        conversations.append({
            "friend": friend,
            "last_message": last_message,
            "unread_count": unread_count
        })

    # Sort by last message time
    from datetime import timezone
    conversations.sort(
        key=lambda x: x["last_message"].created_at if x["last_message"] else datetime.min.replace(tzinfo=timezone.utc),
        reverse=True
    )

    return conversations

@router.get("/messages/{friend_id}", response_model=schemas.MessageListResponse)
async def get_messages(
    friend_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get messages with a specific friend"""

    # Check if they are friends
    if not check_friendship(current_user.id, friend_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view messages with friends"
        )

    # Get messages
    messages = db.query(models.Message).filter(
        or_(
            and_(models.Message.sender_id == current_user.id,
                 models.Message.receiver_id == friend_id),
            and_(models.Message.sender_id == friend_id,
                 models.Message.receiver_id == current_user.id)
        )
    ).order_by(models.Message.created_at.desc()).offset(skip).limit(limit).all()

    # Mark messages as read
    db.query(models.Message).filter(
        models.Message.sender_id == friend_id,
        models.Message.receiver_id == current_user.id,
        models.Message.is_read == False
    ).update({"is_read": True})
    db.commit()

    # Count unread messages
    unread_count = db.query(models.Message).filter(
        models.Message.sender_id == friend_id,
        models.Message.receiver_id == current_user.id,
        models.Message.is_read == False
    ).count()

    return {
        "messages": list(reversed(messages)),  # Return in chronological order
        "unread_count": unread_count
    }

@router.put("/messages/{message_id}/read")
async def mark_message_read(
    message_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark a message as read"""

    message = db.query(models.Message).filter(
        models.Message.id == message_id,
        models.Message.receiver_id == current_user.id
    ).first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    message.is_read = True
    db.commit()

    return {"message": "Message marked as read"}

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a message (only sender can delete)"""

    message = db.query(models.Message).filter(
        models.Message.id == message_id,
        models.Message.sender_id == current_user.id
    ).first()

    if not message:
        raise HTTPException(
            status_code=404,
            detail="Message not found or you don't have permission to delete it"
        )

    # Delete associated file if exists
    if message.file_url:
        file_path = message.file_url.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)

    db.delete(message)
    db.commit()

    return {"message": "Message deleted successfully"}

@router.get("/stats")
async def get_message_stats(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get message statistics for the current user"""

    # Count total messages sent
    messages_sent = db.query(models.Message).filter(
        models.Message.sender_id == current_user.id
    ).count()

    # Count total messages received
    messages_received = db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id
    ).count()

    # Count unread messages
    unread_messages = db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id,
        models.Message.is_read == False
    ).count()

    # Count unique conversations (unique friends with messages)
    sent_to = db.query(models.Message.receiver_id).filter(
        models.Message.sender_id == current_user.id
    ).distinct().all()
    received_from = db.query(models.Message.sender_id).filter(
        models.Message.receiver_id == current_user.id
    ).distinct().all()

    unique_conversations = len(set([r[0] for r in sent_to] + [r[0] for r in received_from]))

    return {
        "messages_sent": messages_sent,
        "messages_received": messages_received,
        "total_messages": messages_sent + messages_received,
        "unread_messages": unread_messages,
        "unique_conversations": unique_conversations
    }