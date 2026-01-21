from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, BackgroundTasks
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
from app.websocket import manager, WSMessage, WSMessageType
from app.s3_storage import s3_storage, save_upload_file_locally, is_s3_url
from app.rate_limit import conditional_rate_limit, RateLimits
from app.services.push_notification_service import send_message_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


async def send_conversation_update(sender: models.User, receiver_id: int, message: models.Message, db: Session):
    """Send conversation update notification to receiver for their conversation list"""
    # Count unread messages from the sender to receiver
    unread_count = db.query(models.Message).filter(
        models.Message.sender_id == sender.id,
        models.Message.receiver_id == receiver_id,
        models.Message.is_read == False
    ).count()

    await manager.send_to_user(receiver_id, WSMessage(
        type=WSMessageType.CONVERSATION_UPDATE,
        data={
            "friend_id": sender.id,
            "friend_name": sender.username,
            "friend_avatar": sender.profile_picture,
            "last_message": {
                "id": message.id,
                "content": message.content,
                "message_type": message.message_type.value,
                "created_at": message.created_at.isoformat(),
                "sender_id": sender.id
            },
            "unread_count": unread_count
        }
    ))

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
os.makedirs(f"{UPLOAD_DIR}/images", exist_ok=True)
os.makedirs(f"{UPLOAD_DIR}/voice", exist_ok=True)

# File size limits (in bytes)
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_VOICE_SIZE = 25 * 1024 * 1024  # 25 MB
MAX_TEXT_LENGTH = 10000  # 10K characters

async def validate_file_size(file: UploadFile, max_size: int, file_type: str):
    """Validate file size doesn't exceed maximum"""
    # Read file content to check size
    content = await file.read()
    await file.seek(0)  # Reset file pointer
    if len(content) > max_size:
        max_mb = max_size / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{file_type} file too large. Maximum size is {max_mb:.0f}MB"
        )
    return content

def check_friendship(user1_id: int, user2_id: int, db: Session) -> bool:
    """Check if two users are friends"""
    user1 = db.query(models.User).filter(models.User.id == user1_id).first()
    user2 = db.query(models.User).filter(models.User.id == user2_id).first()

    if not user1 or not user2:
        return False

    return user2 in user1.friends

@router.post("/send/text", response_model=schemas.MessageResponse)
@conditional_rate_limit(RateLimits.SEND_MESSAGE)
async def send_text_message(
    request: Request,
    background_tasks: BackgroundTasks,
    receiver_id: int = Form(...),
    content: str = Form(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a text message to a friend"""

    # Validate content - empty strings not allowed
    if not content or not content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty"
        )

    if len(content) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Message too long. Maximum length is {MAX_TEXT_LENGTH} characters"
        )

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
    await manager.send_to_user(receiver_id, WSMessage(
        type=WSMessageType.MESSAGE_NEW,
        data={
            "id": message.id,
            "sender_id": current_user.id,
            "sender_name": current_user.username,
            "sender_avatar": current_user.profile_picture,
            "sender_type": current_user.user_type.value,
            "receiver_id": receiver_id,
            "message_type": "text",
            "content": content,
            "is_read": False,
            "created_at": message.created_at.isoformat(),
            "room_id": f"dm-{min(current_user.id, receiver_id)}-{max(current_user.id, receiver_id)}"
        }
    ))

    # Send conversation update for the conversation list
    await send_conversation_update(current_user, receiver_id, message, db)

    # Send push notification for offline/background users
    sender_name = current_user.full_name or current_user.username
    background_tasks.add_task(
        send_message_notification,
        db,
        receiver_id,
        sender_name,
        content,
        current_user.id,
    )

    return message

@router.post("/send/image", response_model=schemas.MessageResponse)
@conditional_rate_limit(RateLimits.SEND_IMAGE)
async def send_image_message(
    request: Request,
    background_tasks: BackgroundTasks,
    receiver_id: int = Form(...),
    file: UploadFile = File(...),
    content: str = Form(None),  # Optional caption for the image
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send an image message to a friend with optional caption"""

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

    # Validate file size
    await validate_file_size(file, MAX_IMAGE_SIZE, "Image")

    # Sanitize filename - only allow safe extensions
    allowed_extensions = ["jpg", "jpeg", "png", "gif", "webp"]
    file_extension = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_extension not in allowed_extensions:
        file_extension = "jpg"  # Default to jpg if extension is invalid
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

    # Create message with optional caption
    message = models.Message(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        message_type=models.MessageType.IMAGE,
        content=content.strip() if content else None,  # Caption text
        file_url=file_url,
        file_name=file.filename
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    # Send WebSocket notification to receiver if online
    await manager.send_to_user(receiver_id, WSMessage(
        type=WSMessageType.MESSAGE_NEW,
        data={
            "id": message.id,
            "sender_id": current_user.id,
            "sender_name": current_user.username,
            "sender_avatar": current_user.profile_picture,
            "sender_type": current_user.user_type.value,
            "receiver_id": receiver_id,
            "message_type": "image",
            "file_url": message.file_url,
            "file_name": message.file_name,
            "is_read": False,
            "created_at": message.created_at.isoformat(),
            "room_id": f"dm-{min(current_user.id, receiver_id)}-{max(current_user.id, receiver_id)}"
        }
    ))

    # Send conversation update for the conversation list
    await send_conversation_update(current_user, receiver_id, message, db)

    # Send push notification for offline/background users
    sender_name = current_user.full_name or current_user.username
    preview = f"📷 Image" + (f": {content[:50]}..." if content and len(content) > 50 else f": {content}" if content else "")
    background_tasks.add_task(
        send_message_notification,
        db,
        receiver_id,
        sender_name,
        preview,
        current_user.id,
    )

    return message

@router.post("/send/voice", response_model=schemas.MessageResponse)
@conditional_rate_limit(RateLimits.SEND_VOICE)
async def send_voice_message(
    request: Request,
    background_tasks: BackgroundTasks,
    receiver_id: int = Form(...),
    duration: int = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a voice message to a friend"""

    # Validate duration
    if duration <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voice message duration must be greater than 0"
        )
    if duration > 300:  # Max 5 minutes
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voice message cannot exceed 5 minutes"
        )

    # Check if they are friends
    if not check_friendship(current_user.id, receiver_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only send messages to friends"
        )

    # Validate file type - support various mobile recording formats
    allowed_types = [
        "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav",
        "audio/x-caf",   # iOS Core Audio Format
        "audio/aac",     # AAC audio
        "audio/3gpp",    # Android 3GP format
        "audio/3gpp2",   # Android 3GP2 format
        "audio/m4a",     # M4A audio
        "audio/x-m4a",   # M4A audio (alternative MIME)
        "application/octet-stream",  # Fallback for unknown types
    ]
    if file.content_type not in allowed_types:
        logger.warning(f"Voice message rejected - unsupported content type: {file.content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid audio format: {file.content_type}. Supported: webm, mp4, mp3, ogg, wav, caf, aac, 3gp, m4a"
        )

    # Validate file size
    await validate_file_size(file, MAX_VOICE_SIZE, "Voice")

    # Sanitize filename - only allow safe extensions
    allowed_extensions = ["webm", "mp4", "mp3", "ogg", "wav", "caf", "aac", "3gp", "m4a"]
    file_extension = file.filename.split(".")[-1].lower() if "." in file.filename else "m4a"
    if file_extension not in allowed_extensions:
        file_extension = "m4a"  # Default to m4a (most compatible)
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
    await manager.send_to_user(receiver_id, WSMessage(
        type=WSMessageType.MESSAGE_NEW,
        data={
            "id": message.id,
            "sender_id": current_user.id,
            "sender_name": current_user.username,
            "sender_avatar": current_user.profile_picture,
            "sender_type": current_user.user_type.value,
            "receiver_id": receiver_id,
            "message_type": "voice",
            "file_url": message.file_url,
            "file_name": message.file_name,
            "duration": message.duration,
            "is_read": False,
            "created_at": message.created_at.isoformat(),
            "room_id": f"dm-{min(current_user.id, receiver_id)}-{max(current_user.id, receiver_id)}"
        }
    ))

    # Send conversation update for the conversation list
    await send_conversation_update(current_user, receiver_id, message, db)

    # Send push notification for offline/background users
    sender_name = current_user.full_name or current_user.username
    preview = f"🎤 Voice message ({duration}s)"
    background_tasks.add_task(
        send_message_notification,
        db,
        receiver_id,
        sender_name,
        preview,
        current_user.id,
    )

    return message

@router.get("/conversations", response_model=List[schemas.ConversationResponse])
async def get_conversations(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all conversations including those with former friends.

    Conversations are preserved even after unfriending. The is_friend field
    indicates whether users are still friends (can send messages) or not.
    """

    conversations = []
    friend_ids = {friend.id for friend in current_user.friends}

    # First, add conversations with current friends
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
            "unread_count": unread_count,
            "is_friend": True
        })

    # Find all users who have message history with current user but are not friends
    # Get all unique user IDs from messages where current user is sender or receiver
    sent_to_users = db.query(models.Message.receiver_id).filter(
        models.Message.sender_id == current_user.id
    ).distinct().all()

    received_from_users = db.query(models.Message.sender_id).filter(
        models.Message.receiver_id == current_user.id
    ).distinct().all()

    # Combine and get unique user IDs
    all_conversation_user_ids = set(
        [u[0] for u in sent_to_users] + [u[0] for u in received_from_users]
    )

    # Filter to only non-friends (former friends with message history)
    former_friend_ids = all_conversation_user_ids - friend_ids

    # Add conversations with former friends
    for user_id in former_friend_ids:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            continue

        # Get last message
        last_message = db.query(models.Message).filter(
            or_(
                and_(models.Message.sender_id == current_user.id,
                     models.Message.receiver_id == user_id),
                and_(models.Message.sender_id == user_id,
                     models.Message.receiver_id == current_user.id)
            )
        ).order_by(models.Message.created_at.desc()).first()

        # Count unread messages
        unread_count = db.query(models.Message).filter(
            models.Message.sender_id == user_id,
            models.Message.receiver_id == current_user.id,
            models.Message.is_read == False
        ).count()

        conversations.append({
            "friend": user,
            "last_message": last_message,
            "unread_count": unread_count,
            "is_friend": False
        })

    # Sort by last message time (handle both timezone-aware and naive datetimes)
    def get_sort_key(x):
        if x["last_message"] is None:
            return datetime.min
        return x["last_message"].created_at.replace(tzinfo=None) if x["last_message"].created_at.tzinfo else x["last_message"].created_at

    conversations.sort(key=get_sort_key, reverse=True)

    return conversations

@router.get("/messages/{friend_id}", response_model=schemas.MessageListResponse)
async def get_messages(
    friend_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get messages with a specific user (friend or former friend)

    Note: Messages are preserved even after unfriending. Users can view
    their chat history but cannot send new messages to non-friends.
    """

    # Verify the other user exists
    other_user = db.query(models.User).filter(models.User.id == friend_id).first()
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
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
        if is_s3_url(message.file_url):
            # Handle S3 file deletion
            try:
                s3_storage.delete_file(message.file_url)
                logger.info(f"Deleted S3 file: {message.file_url}")
            except Exception as e:
                logger.error(f"Failed to delete S3 file: {e}")
        elif not message.file_url.startswith("http"):
            # Handle local file deletion
            # Sanitize path to prevent traversal attacks
            file_path = message.file_url.lstrip("/")
            # Get absolute paths for comparison
            abs_upload_dir = os.path.abspath(UPLOAD_DIR)
            abs_file_path = os.path.abspath(file_path)
            # Only delete if file is within upload directory (prevent path traversal)
            if abs_file_path.startswith(abs_upload_dir) and os.path.exists(abs_file_path):
                try:
                    os.remove(abs_file_path)
                    logger.info(f"Deleted local file: {abs_file_path}")
                except OSError as e:
                    logger.error(f"Failed to delete file {abs_file_path}: {e}")

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

    # Count unread messages (excluding broadcasts which have their own count)
    # Broadcasts have content starting with "[ADMIN BROADCAST]"
    unread_messages = db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id,
        models.Message.is_read == False,
        or_(
            models.Message.content == None,
            ~models.Message.content.like("[ADMIN BROADCAST]%")
        )
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


# ===== BROADCASTS ENDPOINTS =====

@router.get("/broadcasts")
async def get_broadcasts(
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get broadcast messages received by the current user"""
    # Broadcasts are messages from admin containing [ADMIN BROADCAST] prefix
    broadcasts = db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id,
        models.Message.content.like("[ADMIN BROADCAST]%")
    ).order_by(models.Message.created_at.desc()).offset(skip).limit(limit).all()

    total = db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id,
        models.Message.content.like("[ADMIN BROADCAST]%")
    ).count()

    unread = db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id,
        models.Message.content.like("[ADMIN BROADCAST]%"),
        models.Message.is_read == False
    ).count()

    return {
        "broadcasts": [
            {
                "id": b.id,
                "content": b.content.replace("[ADMIN BROADCAST] ", ""),
                "is_read": b.is_read,
                "created_at": b.created_at.isoformat() if b.created_at else None
            }
            for b in broadcasts
        ],
        "total": total,
        "unread": unread
    }


@router.put("/broadcasts/{broadcast_id}/read")
async def mark_broadcast_read(
    broadcast_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark a broadcast as read"""
    broadcast = db.query(models.Message).filter(
        models.Message.id == broadcast_id,
        models.Message.receiver_id == current_user.id,
        models.Message.content.like("[ADMIN BROADCAST]%")
    ).first()

    if not broadcast:
        raise HTTPException(status_code=404, detail="Broadcast not found")

    broadcast.is_read = True
    db.commit()

    return {"message": "Broadcast marked as read"}


@router.put("/broadcasts/read-all")
async def mark_all_broadcasts_read(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark all broadcasts as read"""
    db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id,
        models.Message.content.like("[ADMIN BROADCAST]%"),
        models.Message.is_read == False
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()

    return {"message": "All broadcasts marked as read"}