from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional
from datetime import datetime
import os
import uuid
import shutil
import logging
from app import models, schemas, auth
from app.database import get_db
from app.s3_storage import s3_storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.patch("/me")
async def update_my_profile(
    profile_data: schemas.ProfileUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile"""

    # Update fields if provided
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name

    if profile_data.bio is not None:
        current_user.bio = profile_data.bio

    if profile_data.phone is not None:
        current_user.phone = profile_data.phone

    # Company name only for clients
    if profile_data.company_name is not None and current_user.user_type == models.UserType.CLIENT:
        current_user.company_name = profile_data.company_name

    db.commit()
    db.refresh(current_user)

    return {"message": "Profile updated successfully"}


@router.get("/{user_id}")
async def get_user_profile(
    user_id: int,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get user profile - public endpoint with additional info for friends"""

    # Get the user
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get total friends count
    friends_count = db.query(models.friends_association).filter(
        or_(
            models.friends_association.c.user_id == user_id,
            models.friends_association.c.friend_id == user_id
        )
    ).count()

    # Get reviews statistics
    reviews_received = db.query(models.Review).filter(
        models.Review.reviewee_id == user_id
    ).count()

    avg_rating = db.query(func.avg(models.Review.rating)).filter(
        models.Review.reviewee_id == user_id
    ).scalar()

    # Calculate account age in days
    from datetime import timezone
    now_utc = datetime.now(timezone.utc)
    if user.created_at.tzinfo is None:
        # Convert naive datetime to timezone-aware
        created_at = user.created_at.replace(tzinfo=timezone.utc)
    else:
        created_at = user.created_at
    account_age_days = (now_utc - created_at).days

    # Check if current user is friends with this user
    is_friend = False
    if current_user:
        friendship = db.query(models.friends_association).filter(
            or_(
                and_(
                    models.friends_association.c.user_id == current_user.id,
                    models.friends_association.c.friend_id == user_id
                ),
                and_(
                    models.friends_association.c.user_id == user_id,
                    models.friends_association.c.friend_id == current_user.id
                )
            )
        ).first()
        is_friend = friendship is not None

    # Separate counts for clients and players
    if user.user_type == models.UserType.PLAYER:
        # Count connected clients
        connected_clients = db.query(models.User).join(
            models.friends_association,
            or_(
                and_(
                    models.friends_association.c.user_id == user_id,
                    models.friends_association.c.friend_id == models.User.id
                ),
                and_(
                    models.friends_association.c.friend_id == user_id,
                    models.friends_association.c.user_id == models.User.id
                )
            )
        ).filter(models.User.user_type == models.UserType.CLIENT).count()

        profile_data = {
            "id": user.id,
            "user_id": user.user_id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email if is_friend else None,  # Only show email to friends
            "user_type": user.user_type,
            "player_level": user.player_level,
            "credits": user.credits if is_friend else None,  # Only show credits to friends
            "created_at": user.created_at,
            "account_age_days": account_age_days,
            "is_active": user.is_active,
            "total_clients": connected_clients,
            "total_friends": friends_count,
            "reviews_received": reviews_received,
            "average_rating": float(avg_rating) if avg_rating else 0.0,
            "is_friend": is_friend,
            "accepted_payment_methods": [],  # Players don't have payment methods
            "available_games": []  # Players don't provide games
        }
    else:  # CLIENT
        # Count connected players
        connected_players = db.query(models.User).join(
            models.friends_association,
            or_(
                and_(
                    models.friends_association.c.user_id == user_id,
                    models.friends_association.c.friend_id == models.User.id
                ),
                and_(
                    models.friends_association.c.friend_id == user_id,
                    models.friends_association.c.user_id == models.User.id
                )
            )
        ).filter(models.User.user_type == models.UserType.PLAYER).count()

        # Get client's accepted payment methods
        client_payment_methods = db.query(models.ClientPaymentMethod).join(
            models.PaymentMethod
        ).filter(
            and_(
                models.ClientPaymentMethod.client_id == user_id,
                models.ClientPaymentMethod.is_active == True,
                models.PaymentMethod.is_active == True
            )
        ).all()

        payment_methods = [
            {
                "id": cpm.payment_method.id,
                "name": cpm.payment_method.name,
                "display_name": cpm.payment_method.display_name,
                "icon_url": cpm.payment_method.icon_url
            }
            for cpm in client_payment_methods
        ]

        # Get client's available games
        client_games = db.query(models.ClientGame).join(
            models.Game
        ).filter(
            and_(
                models.ClientGame.client_id == user_id,
                models.ClientGame.is_active == True,
                models.Game.is_active == True
            )
        ).all()

        available_games = [
            {
                "id": cg.game.id,
                "name": cg.game.name,
                "display_name": cg.game.display_name,
                "icon_url": cg.game.icon_url,
                "category": cg.game.category
            }
            for cg in client_games
        ]

        profile_data = {
            "id": user.id,
            "user_id": user.user_id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email if is_friend else None,  # Only show email to friends
            "user_type": user.user_type,
            "company_name": user.company_name,
            "created_at": user.created_at,
            "account_age_days": account_age_days,
            "is_active": user.is_active,
            "total_players": connected_players,
            "total_friends": friends_count,
            "reviews_received": reviews_received,
            "average_rating": float(avg_rating) if avg_rating else 0.0,
            "is_friend": is_friend,
            "accepted_payment_methods": payment_methods,
            "available_games": available_games
        }

    return profile_data

@router.get("/{user_id}/reviews")
async def get_user_profile_reviews(
    user_id: int,
    skip: int = 0,
    limit: int = 10,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get reviews for a user's profile - publicly visible"""

    # Check if user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get reviews
    reviews_query = db.query(models.Review).filter(
        models.Review.reviewee_id == user_id
    ).order_by(models.Review.created_at.desc())

    total_count = reviews_query.count()
    reviews = reviews_query.offset(skip).limit(limit).all()

    # Format reviews with reviewer info
    formatted_reviews = []
    for review in reviews:
        reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
        formatted_reviews.append({
            "id": review.id,
            "rating": review.rating,
            "title": review.title,
            "comment": review.comment,
            "created_at": review.created_at,
            "reviewer": {
                "id": reviewer.id,
                "user_id": reviewer.user_id,
                "username": reviewer.username,
                "full_name": reviewer.full_name,
                "user_type": reviewer.user_type
            }
        })

    # Calculate average rating
    avg_rating = db.query(func.avg(models.Review.rating)).filter(
        models.Review.reviewee_id == user_id
    ).scalar()

    # Get rating distribution
    rating_dist = {}
    for i in range(1, 6):
        count = db.query(models.Review).filter(
            models.Review.reviewee_id == user_id,
            models.Review.rating == i
        ).count()
        rating_dist[i] = count

    return {
        "reviews": formatted_reviews,
        "total_count": total_count,
        "average_rating": float(avg_rating) if avg_rating else 0.0,
        "rating_distribution": rating_dist
    }

@router.get("/{user_id}/friends")
async def get_user_friends(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get user's friends list - visibility depends on privacy settings"""

    # Check if user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # For now, make friends list public (can add privacy settings later)
    # Get all friend relationships
    friendships = db.query(models.friends_association).filter(
        or_(
            models.friends_association.c.user_id == user_id,
            models.friends_association.c.friend_id == user_id
        )
    ).all()

    friend_ids = []
    for friendship in friendships:
        if friendship.user_id == user_id:
            friend_ids.append(friendship.friend_id)
        else:
            friend_ids.append(friendship.user_id)

    # Get friend details
    friends = db.query(models.User).filter(
        models.User.id.in_(friend_ids)
    ).offset(skip).limit(limit).all()

    formatted_friends = []
    for friend in friends:
        friend_data = {
            "id": friend.id,
            "user_id": friend.user_id,
            "username": friend.username,
            "full_name": friend.full_name,
            "user_type": friend.user_type,
            "is_active": friend.is_active
        }

        if friend.user_type == models.UserType.PLAYER:
            friend_data["player_level"] = friend.player_level
        else:
            friend_data["company_name"] = friend.company_name

        formatted_friends.append(friend_data)

    return {
        "friends": formatted_friends,
        "total_count": len(friend_ids)
    }

@router.get("/{user_id}/stats")
async def get_user_stats(
    user_id: int,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get detailed statistics for a user"""

    # Check if user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Basic stats
    stats = {
        "user_type": user.user_type,
        "account_created": user.created_at,
        "account_age_days": (datetime.utcnow() - user.created_at).days,
        "last_active": user.updated_at if hasattr(user, 'updated_at') else user.created_at
    }

    # Friend stats
    friends_count = db.query(models.friends_association).filter(
        or_(
            models.friends_association.c.user_id == user_id,
            models.friends_association.c.friend_id == user_id
        )
    ).count()
    stats["total_friends"] = friends_count

    # Review stats
    reviews_received = db.query(models.Review).filter(
        models.Review.reviewee_id == user_id
    ).count()
    reviews_given = db.query(models.Review).filter(
        models.Review.reviewer_id == user_id
    ).count()

    avg_rating_received = db.query(func.avg(models.Review.rating)).filter(
        models.Review.reviewee_id == user_id
    ).scalar()

    stats["reviews_received"] = reviews_received
    stats["reviews_given"] = reviews_given
    stats["average_rating"] = float(avg_rating_received) if avg_rating_received else 0.0

    # Type-specific stats
    if user.user_type == models.UserType.PLAYER:
        # Count connected clients
        connected_clients = db.query(models.User).join(
            models.friends_association,
            or_(
                and_(
                    models.friends_association.c.user_id == user_id,
                    models.friends_association.c.friend_id == models.User.id
                ),
                and_(
                    models.friends_association.c.friend_id == user_id,
                    models.friends_association.c.user_id == models.User.id
                )
            )
        ).filter(models.User.user_type == models.UserType.CLIENT).count()

        stats["total_clients"] = connected_clients
        stats["player_level"] = user.player_level

    else:  # CLIENT
        # Count connected players
        connected_players = db.query(models.User).join(
            models.friends_association,
            or_(
                and_(
                    models.friends_association.c.user_id == user_id,
                    models.friends_association.c.friend_id == models.User.id
                ),
                and_(
                    models.friends_association.c.friend_id == user_id,
                    models.friends_association.c.user_id == models.User.id
                )
            )
        ).filter(models.User.user_type == models.UserType.PLAYER).count()

        stats["total_players"] = connected_players
        stats["company_name"] = user.company_name

    # Message stats (if current user is the profile owner or friend)
    if current_user and (current_user.id == user_id or
                         db.query(models.friends_association).filter(
                             or_(
                                 and_(
                                     models.friends_association.c.user_id == current_user.id,
                                     models.friends_association.c.friend_id == user_id
                                 ),
                                 and_(
                                     models.friends_association.c.user_id == user_id,
                                     models.friends_association.c.friend_id == current_user.id
                                 )
                             )
                         ).first()):
        messages_sent = db.query(models.Message).filter(
            models.Message.sender_id == user_id
        ).count()
        messages_received = db.query(models.Message).filter(
            models.Message.receiver_id == user_id
        ).count()

        stats["messages_sent"] = messages_sent
        stats["messages_received"] = messages_received

    return stats

@router.post("/{user_id}/profile-picture")
async def upload_profile_picture(
    user_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload profile picture for user"""

    # Check if user exists and current user has permission
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only allow users to upload their own profile picture
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only upload your own profile picture")

    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Validate file size (max 5MB)
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size too large. Maximum 5MB allowed")

    # Reset file pointer
    await file.seek(0)

    # Generate unique filename
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'jpg'
    if file_extension not in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: jpg, jpeg, png, gif, webp")

    unique_filename = f"{uuid.uuid4()}.{file_extension}"

    # Upload file (S3 or local fallback)
    file_url = None
    if s3_storage.enabled:
        # Upload to S3
        try:
            file.file.seek(0)  # Reset file pointer
            file_url = s3_storage.upload_file(
                file.file,
                unique_filename,
                folder="uploads/profile_pictures",
                content_type=file.content_type
            )
            if file_url:
                logger.info(f"Profile picture uploaded to S3: {file_url}")
            else:
                raise Exception("S3 upload returned None")
        except Exception as e:
            logger.error(f"S3 upload failed: {e}, falling back to local storage")
            # Fallback to local if S3 fails
            upload_dir = "uploads/profile_pictures"
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, unique_filename)
            file.file.seek(0)
            try:
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                file_url = f"/{file_path}"
            except Exception as save_error:
                raise HTTPException(status_code=500, detail="Failed to save file")
    else:
        # Local filesystem (development/fallback)
        upload_dir = "uploads/profile_pictures"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, unique_filename)
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_url = f"/{file_path}"
            logger.warning(f"Profile picture saved locally (ephemeral): {file_url}")
        except Exception as e:
            raise HTTPException(status_code=500, detail="Failed to save file")

    # Remove old profile picture if exists (only for local files)
    if user.profile_picture:
        old_file_url = user.profile_picture
        # If it's an S3 URL, try to delete from S3
        if s3_storage.enabled and old_file_url.startswith('https://'):
            try:
                s3_storage.delete_file(old_file_url)
                logger.info(f"Deleted old profile picture from S3")
            except Exception as e:
                logger.error(f"Failed to delete old S3 file: {e}")
        # If it's a local file path
        elif old_file_url.startswith('/'):
            old_file_path = old_file_url.lstrip('/')
            if os.path.exists(old_file_path):
                try:
                    os.remove(old_file_path)
                except Exception as e:
                    logger.error(f"Failed to delete old local file: {e}")

    # Update user profile picture in database
    user.profile_picture = file_url
    db.commit()

    return {
        "message": "Profile picture uploaded successfully",
        "profile_picture_url": file_url
    }

@router.delete("/{user_id}/profile-picture")
async def delete_profile_picture(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete user's profile picture"""

    # Check if user exists and current user has permission
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only allow users to delete their own profile picture
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own profile picture")

    if not user.profile_picture:
        raise HTTPException(status_code=404, detail="No profile picture to delete")

    # Delete file from filesystem
    if os.path.exists(user.profile_picture.lstrip('/')):
        try:
            os.remove(user.profile_picture.lstrip('/'))
        except:
            pass  # Continue even if file deletion fails

    # Remove from database
    user.profile_picture = None
    db.commit()

    return {"message": "Profile picture deleted successfully"}