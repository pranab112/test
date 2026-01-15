from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import Optional
import os
import uuid
import logging
from datetime import datetime, timezone
from io import BytesIO

from app import models, schemas, auth
from app.database import get_db
from app.models import PostVisibility
from app.s3_storage import s3_storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/community", tags=["community"])


def get_visibility_for_user(user: models.User) -> PostVisibility:
    """Get the appropriate visibility based on user type"""
    if user.user_type == models.UserType.PLAYER:
        return PostVisibility.PLAYERS
    elif user.user_type == models.UserType.CLIENT:
        return PostVisibility.CLIENTS
    else:
        raise HTTPException(status_code=403, detail="Admins cannot access community")


def format_post_response(post: models.CommunityPost, current_user_id: int) -> dict:
    """Format a post for API response"""
    is_liked = any(like.user_id == current_user_id for like in post.likes)

    return {
        "id": post.id,
        "content": post.content,
        "image_url": post.image_url,
        "visibility": post.visibility.value,
        "author": {
            "id": post.author.id,
            "username": post.author.username,
            "full_name": post.author.full_name,
            "profile_picture": post.author.profile_picture,
            "user_type": post.author.user_type.value
        },
        "likes_count": len(post.likes),
        "comments_count": len(post.comments),
        "is_liked": is_liked,
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "updated_at": post.updated_at.isoformat() if post.updated_at else None
    }


def format_comment_response(comment: models.PostComment) -> dict:
    """Format a comment for API response"""
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "content": comment.content,
        "author": {
            "id": comment.author.id,
            "username": comment.author.username,
            "full_name": comment.author.full_name,
            "profile_picture": comment.author.profile_picture,
            "user_type": comment.author.user_type.value
        },
        "created_at": comment.created_at.isoformat() if comment.created_at else None
    }


# ============= POST ENDPOINTS =============

@router.get("/posts")
async def get_posts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get community posts for the user's community (player or client)"""
    visibility = get_visibility_for_user(current_user)

    # Get total count
    total = db.query(models.CommunityPost).filter(
        models.CommunityPost.visibility == visibility,
        models.CommunityPost.is_active == True
    ).count()

    # Get paginated posts
    posts = db.query(models.CommunityPost).filter(
        models.CommunityPost.visibility == visibility,
        models.CommunityPost.is_active == True
    ).options(
        joinedload(models.CommunityPost.author),
        joinedload(models.CommunityPost.likes),
        joinedload(models.CommunityPost.comments)
    ).order_by(desc(models.CommunityPost.created_at)).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return {
        "posts": [format_post_response(post, current_user.id) for post in posts],
        "total": total,
        "page": page,
        "per_page": per_page,
        "has_more": (page * per_page) < total
    }


@router.post("/posts")
async def create_post(
    request: schemas.CreatePostRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new community post"""
    visibility = get_visibility_for_user(current_user)

    post = models.CommunityPost(
        author_id=current_user.id,
        content=request.content,
        image_url=request.image_url,
        visibility=visibility
    )

    db.add(post)
    db.commit()
    db.refresh(post)

    # Reload with relationships
    post = db.query(models.CommunityPost).options(
        joinedload(models.CommunityPost.author),
        joinedload(models.CommunityPost.likes),
        joinedload(models.CommunityPost.comments)
    ).filter(models.CommunityPost.id == post.id).first()

    return format_post_response(post, current_user.id)


@router.post("/posts/upload-image")
async def upload_post_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload an image for a community post"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.")

    # Check file size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    # Generate unique filename
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        ext = "jpg"
    filename = f"{uuid.uuid4()}.{ext}"

    image_url = None

    if s3_storage.enabled:
        # Upload to S3
        try:
            file_obj = BytesIO(content)
            image_url = s3_storage.upload_file(
                file_obj,
                filename,
                folder="uploads/community",
                content_type=file.content_type
            )
            if image_url:
                logger.info(f"Community image uploaded to S3: {image_url}")
            else:
                raise Exception("S3 upload returned None")
        except Exception as e:
            logger.error(f"S3 upload failed: {e}, falling back to local storage")
            # Fallback to local storage
            upload_dir = "uploads/community"
            os.makedirs(upload_dir, exist_ok=True)
            filepath = os.path.join(upload_dir, filename)
            with open(filepath, "wb") as f:
                f.write(content)
            image_url = f"/uploads/community/{filename}"
    else:
        # Local storage (development/fallback)
        upload_dir = "uploads/community"
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(content)
        image_url = f"/uploads/community/{filename}"
        logger.warning(f"Community image saved locally (ephemeral): {image_url}")

    return {"image_url": image_url}


@router.get("/posts/{post_id}")
async def get_post(
    post_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific post with comments"""
    visibility = get_visibility_for_user(current_user)

    post = db.query(models.CommunityPost).options(
        joinedload(models.CommunityPost.author),
        joinedload(models.CommunityPost.likes),
        joinedload(models.CommunityPost.comments).joinedload(models.PostComment.author)
    ).filter(
        models.CommunityPost.id == post_id,
        models.CommunityPost.visibility == visibility,
        models.CommunityPost.is_active == True
    ).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    response = format_post_response(post, current_user.id)
    response["comments"] = [format_comment_response(c) for c in post.comments if c.is_active]

    return response


@router.put("/posts/{post_id}")
async def update_post(
    post_id: int,
    request: schemas.UpdatePostRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a post (only author can update)"""
    post = db.query(models.CommunityPost).filter(
        models.CommunityPost.id == post_id,
        models.CommunityPost.is_active == True
    ).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own posts")

    if request.content:
        post.content = request.content

    post.updated_at = datetime.now(timezone.utc)
    db.commit()

    # Reload with relationships
    post = db.query(models.CommunityPost).options(
        joinedload(models.CommunityPost.author),
        joinedload(models.CommunityPost.likes),
        joinedload(models.CommunityPost.comments)
    ).filter(models.CommunityPost.id == post_id).first()

    return format_post_response(post, current_user.id)


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a post (only author can delete)"""
    post = db.query(models.CommunityPost).filter(
        models.CommunityPost.id == post_id,
        models.CommunityPost.is_active == True
    ).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own posts")

    post.is_active = False
    db.commit()

    return {"message": "Post deleted successfully"}


# ============= LIKE ENDPOINTS =============

@router.post("/posts/{post_id}/like")
async def like_post(
    post_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Like a post"""
    visibility = get_visibility_for_user(current_user)

    post = db.query(models.CommunityPost).filter(
        models.CommunityPost.id == post_id,
        models.CommunityPost.visibility == visibility,
        models.CommunityPost.is_active == True
    ).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Check if already liked
    existing_like = db.query(models.PostLike).filter(
        models.PostLike.post_id == post_id,
        models.PostLike.user_id == current_user.id
    ).first()

    if existing_like:
        raise HTTPException(status_code=400, detail="You have already liked this post")

    like = models.PostLike(
        post_id=post_id,
        user_id=current_user.id
    )
    db.add(like)
    db.commit()

    # Get updated like count
    likes_count = db.query(models.PostLike).filter(models.PostLike.post_id == post_id).count()

    return {"message": "Post liked", "likes_count": likes_count}


@router.delete("/posts/{post_id}/like")
async def unlike_post(
    post_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Unlike a post"""
    like = db.query(models.PostLike).filter(
        models.PostLike.post_id == post_id,
        models.PostLike.user_id == current_user.id
    ).first()

    if not like:
        raise HTTPException(status_code=400, detail="You have not liked this post")

    db.delete(like)
    db.commit()

    # Get updated like count
    likes_count = db.query(models.PostLike).filter(models.PostLike.post_id == post_id).count()

    return {"message": "Post unliked", "likes_count": likes_count}


# ============= COMMENT ENDPOINTS =============

@router.post("/posts/{post_id}/comments")
async def create_comment(
    post_id: int,
    request: schemas.CreateCommentRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a post"""
    visibility = get_visibility_for_user(current_user)

    post = db.query(models.CommunityPost).filter(
        models.CommunityPost.id == post_id,
        models.CommunityPost.visibility == visibility,
        models.CommunityPost.is_active == True
    ).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment = models.PostComment(
        post_id=post_id,
        author_id=current_user.id,
        content=request.content
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Reload with author
    comment = db.query(models.PostComment).options(
        joinedload(models.PostComment.author)
    ).filter(models.PostComment.id == comment.id).first()

    return format_comment_response(comment)


@router.delete("/posts/{post_id}/comments/{comment_id}")
async def delete_comment(
    post_id: int,
    comment_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a comment (only author can delete)"""
    comment = db.query(models.PostComment).filter(
        models.PostComment.id == comment_id,
        models.PostComment.post_id == post_id,
        models.PostComment.is_active == True
    ).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")

    comment.is_active = False
    db.commit()

    return {"message": "Comment deleted successfully"}


# ============= MY POSTS =============

@router.get("/my-posts")
async def get_my_posts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's posts"""
    # Get total count
    total = db.query(models.CommunityPost).filter(
        models.CommunityPost.author_id == current_user.id,
        models.CommunityPost.is_active == True
    ).count()

    # Get paginated posts
    posts = db.query(models.CommunityPost).filter(
        models.CommunityPost.author_id == current_user.id,
        models.CommunityPost.is_active == True
    ).options(
        joinedload(models.CommunityPost.author),
        joinedload(models.CommunityPost.likes),
        joinedload(models.CommunityPost.comments)
    ).order_by(desc(models.CommunityPost.created_at)).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return {
        "posts": [format_post_response(post, current_user.id) for post in posts],
        "total": total,
        "page": page,
        "per_page": per_page,
        "has_more": (page * per_page) < total
    }
