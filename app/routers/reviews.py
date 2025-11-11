from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional
from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/reviews", tags=["reviews"])

@router.post("/", response_model=schemas.ReviewResponse)
async def create_review(
    review_data: schemas.ReviewCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new review"""

    # Check if reviewee exists
    reviewee = db.query(models.User).filter(models.User.id == review_data.reviewee_id).first()
    if not reviewee:
        raise HTTPException(status_code=404, detail="User to review not found")

    # Can't review yourself
    if review_data.reviewee_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot review yourself")

    # Check if they are friends (bidirectional check)
    friendship = db.query(models.friends_association).filter(
        or_(
            and_(
                models.friends_association.c.user_id == current_user.id,
                models.friends_association.c.friend_id == review_data.reviewee_id
            ),
            and_(
                models.friends_association.c.user_id == review_data.reviewee_id,
                models.friends_association.c.friend_id == current_user.id
            )
        )
    ).first()

    if not friendship:
        raise HTTPException(status_code=400, detail="You can only review your friends")

    # Check if review already exists
    existing_review = db.query(models.Review).filter(
        and_(
            models.Review.reviewer_id == current_user.id,
            models.Review.reviewee_id == review_data.reviewee_id
        )
    ).first()

    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this user")

    # Create review
    review = models.Review(
        reviewer_id=current_user.id,
        reviewee_id=review_data.reviewee_id,
        rating=review_data.rating,
        title=review_data.title,
        comment=review_data.comment
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return review

@router.get("/user/{user_id}", response_model=schemas.ReviewListResponse)
async def get_user_reviews(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get reviews for a specific user"""

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

    # Calculate average rating
    avg_rating = db.query(func.avg(models.Review.rating)).filter(
        models.Review.reviewee_id == user_id
    ).scalar()

    return {
        "reviews": reviews,
        "total_count": total_count,
        "average_rating": float(avg_rating) if avg_rating else None
    }

@router.get("/my-reviews", response_model=schemas.ReviewListResponse)
async def get_my_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get reviews received by the current user"""

    reviews_query = db.query(models.Review).filter(
        models.Review.reviewee_id == current_user.id
    ).order_by(models.Review.created_at.desc())

    total_count = reviews_query.count()
    reviews = reviews_query.offset(skip).limit(limit).all()

    # Calculate average rating
    avg_rating = db.query(func.avg(models.Review.rating)).filter(
        models.Review.reviewee_id == current_user.id
    ).scalar()

    return {
        "reviews": reviews,
        "total_count": total_count,
        "average_rating": float(avg_rating) if avg_rating else None
    }

@router.get("/given", response_model=schemas.ReviewListResponse)
async def get_given_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get reviews given by the current user"""

    reviews_query = db.query(models.Review).filter(
        models.Review.reviewer_id == current_user.id
    ).order_by(models.Review.created_at.desc())

    total_count = reviews_query.count()
    reviews = reviews_query.offset(skip).limit(limit).all()

    return {
        "reviews": reviews,
        "total_count": total_count,
        "average_rating": None  # Not applicable for given reviews
    }

@router.put("/{review_id}", response_model=schemas.ReviewResponse)
async def update_review(
    review_id: int,
    review_update: schemas.ReviewUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update an existing review"""

    review = db.query(models.Review).filter(
        and_(
            models.Review.id == review_id,
            models.Review.reviewer_id == current_user.id
        )
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found or you don't have permission to edit it")

    # Update fields
    if review_update.rating is not None:
        review.rating = review_update.rating
    if review_update.title is not None:
        review.title = review_update.title
    if review_update.comment is not None:
        review.comment = review_update.comment

    db.commit()
    db.refresh(review)

    return review

@router.delete("/{review_id}")
async def delete_review(
    review_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a review"""

    review = db.query(models.Review).filter(
        and_(
            models.Review.id == review_id,
            models.Review.reviewer_id == current_user.id
        )
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found or you don't have permission to delete it")

    db.delete(review)
    db.commit()

    return {"message": "Review deleted successfully"}

@router.get("/stats/{user_id}", response_model=schemas.ReviewStatsResponse)
async def get_review_stats(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get review statistics for a user"""

    # Check if user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get total reviews and average rating
    reviews_query = db.query(models.Review).filter(models.Review.reviewee_id == user_id)
    total_reviews = reviews_query.count()

    avg_rating = db.query(func.avg(models.Review.rating)).filter(
        models.Review.reviewee_id == user_id
    ).scalar()

    # Get rating distribution
    rating_dist = {}
    for i in range(1, 6):
        count = reviews_query.filter(models.Review.rating == i).count()
        rating_dist[i] = count

    return {
        "total_reviews": total_reviews,
        "average_rating": float(avg_rating) if avg_rating else 0.0,
        "rating_distribution": rating_dist
    }

@router.get("/can-review/{user_id}")
async def can_review_user(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Check if current user can review the specified user"""

    # Can't review yourself
    if user_id == current_user.id:
        return {"can_review": False, "reason": "Cannot review yourself"}

    # Check if they are friends (bidirectional check)
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

    if not friendship:
        return {"can_review": False, "reason": "You can only review your friends"}

    # Check if review already exists
    existing_review = db.query(models.Review).filter(
        and_(
            models.Review.reviewer_id == current_user.id,
            models.Review.reviewee_id == user_id
        )
    ).first()

    if existing_review:
        return {"can_review": False, "reason": "You have already reviewed this user", "existing_review_id": existing_review.id}

    return {"can_review": True}