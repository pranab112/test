from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional
from datetime import datetime, timezone
from app import models, schemas, auth
from app.database import get_db
from app.models.enums import ReviewStatus, TicketCategory, TicketStatus, TicketPriority
import uuid

router = APIRouter(prefix="/reviews", tags=["reviews"])


def get_admin_user(current_user: models.User = Depends(auth.get_current_active_user)):
    """Dependency to check if user is admin"""
    if current_user.user_type != models.UserType.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

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

    # Check if user is a trusted reviewer
    if not current_user.is_trusted_reviewer:
        raise HTTPException(
            status_code=403,
            detail="Your reviewing privileges have been suspended due to previous violations"
        )

    # Create review with PENDING status (requires admin approval)
    review = models.Review(
        reviewer_id=current_user.id,
        reviewee_id=review_data.reviewee_id,
        rating=review_data.rating,
        title=review_data.title,
        comment=review_data.comment,
        status=ReviewStatus.PENDING
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
    """Get approved reviews for a specific user"""

    # Check if user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get only APPROVED reviews (visible to everyone)
    reviews_query = db.query(models.Review).filter(
        models.Review.reviewee_id == user_id,
        models.Review.status == ReviewStatus.APPROVED
    ).order_by(models.Review.created_at.desc())

    total_count = reviews_query.count()
    reviews = reviews_query.offset(skip).limit(limit).all()

    # Calculate average rating (only from approved reviews)
    avg_rating = db.query(func.avg(models.Review.rating)).filter(
        models.Review.reviewee_id == user_id,
        models.Review.status == ReviewStatus.APPROVED
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


# ============== ADMIN MODERATION ENDPOINTS ==============

@router.get("/admin/pending", response_model=schemas.ReviewModerationListResponse)
async def get_pending_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, description="Filter by status: pending, approved, rejected, disputed"),
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get reviews for moderation (admin only)"""

    # Base query
    reviews_query = db.query(models.Review)

    # Apply status filter if provided
    if status_filter:
        try:
            status = ReviewStatus(status_filter)
            reviews_query = reviews_query.filter(models.Review.status == status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")

    # Order by pending first, then by creation date
    reviews_query = reviews_query.order_by(
        models.Review.status == ReviewStatus.PENDING,
        models.Review.created_at.desc()
    )

    total_count = reviews_query.count()
    reviews = reviews_query.offset(skip).limit(limit).all()

    # Get counts by status
    pending_count = db.query(models.Review).filter(models.Review.status == ReviewStatus.PENDING).count()
    approved_count = db.query(models.Review).filter(models.Review.status == ReviewStatus.APPROVED).count()
    rejected_count = db.query(models.Review).filter(models.Review.status == ReviewStatus.REJECTED).count()
    disputed_count = db.query(models.Review).filter(models.Review.status == ReviewStatus.DISPUTED).count()

    return {
        "reviews": reviews,
        "total_count": total_count,
        "pending_count": pending_count,
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "disputed_count": disputed_count
    }


@router.post("/admin/{review_id}/moderate", response_model=schemas.ReviewModerationResponse)
async def moderate_review(
    review_id: int,
    moderation: schemas.ReviewModerateRequest,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Approve or reject a review (admin only)"""

    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    action = moderation.action.lower()
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    # Update review status
    if action == "approve":
        review.status = ReviewStatus.APPROVED
    else:
        review.status = ReviewStatus.REJECTED
        # If rejecting, mark reviewer as potentially untrusted after multiple rejections
        rejected_count = db.query(models.Review).filter(
            models.Review.reviewer_id == review.reviewer_id,
            models.Review.status == ReviewStatus.REJECTED
        ).count()
        if rejected_count >= 3:
            reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
            if reviewer:
                reviewer.is_trusted_reviewer = False

    review.moderated_by = current_user.id
    review.moderated_at = datetime.now(timezone.utc)
    review.admin_notes = moderation.admin_notes

    db.commit()
    db.refresh(review)

    return {
        "message": f"Review {action}d successfully",
        "review_id": review.id,
        "new_status": review.status.value,
        "admin_notes": review.admin_notes
    }


@router.post("/appeal", response_model=dict)
async def appeal_review(
    appeal_data: schemas.ReviewAppealCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Appeal a rejected review (creates a support ticket)"""

    # Get the review
    review = db.query(models.Review).filter(models.Review.id == appeal_data.review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Only the reviewee (person who received the review) can appeal
    if review.reviewee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the reviewed user can appeal this review")

    # Can only appeal approved or pending reviews (not already rejected ones)
    if review.status == ReviewStatus.REJECTED:
        raise HTTPException(status_code=400, detail="This review has already been rejected by admin")

    if review.status == ReviewStatus.DISPUTED:
        raise HTTPException(status_code=400, detail="This review is already under appeal")

    # Check if there's already an appeal ticket
    if review.appeal_ticket_id:
        raise HTTPException(status_code=400, detail="An appeal has already been submitted for this review")

    # Create a support ticket for the appeal
    ticket_number = f"TKT-{uuid.uuid4().hex[:8].upper()}"
    ticket = models.Ticket(
        ticket_number=ticket_number,
        user_id=current_user.id,
        subject=f"Review Appeal: Review #{review.id}",
        category=TicketCategory.APPEAL_REVIEW,
        priority=TicketPriority.MEDIUM,
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    db.flush()  # Get ticket ID

    # Add the appeal reason as the first message
    message = models.TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        content=f"Appeal Reason:\n\n{appeal_data.reason}\n\n---\nReview Details:\n- Rating: {review.rating}/5\n- Title: {review.title}\n- Comment: {review.comment or 'N/A'}"
    )
    db.add(message)

    # Link ticket to review and set status to disputed
    review.appeal_ticket_id = ticket.id
    review.status = ReviewStatus.DISPUTED

    db.commit()

    return {
        "message": "Appeal submitted successfully",
        "ticket_number": ticket_number,
        "ticket_id": ticket.id,
        "review_id": review.id
    }


@router.get("/my-pending", response_model=schemas.ReviewListResponse)
async def get_my_pending_reviews(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get reviews you've written that are pending approval"""

    reviews = db.query(models.Review).filter(
        models.Review.reviewer_id == current_user.id,
        models.Review.status == ReviewStatus.PENDING
    ).order_by(models.Review.created_at.desc()).all()

    return {
        "reviews": reviews,
        "total_count": len(reviews),
        "average_rating": None
    }


@router.get("/my-rejected", response_model=schemas.ReviewListResponse)
async def get_my_rejected_reviews(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get reviews you've written that were rejected"""

    reviews = db.query(models.Review).filter(
        models.Review.reviewer_id == current_user.id,
        models.Review.status == ReviewStatus.REJECTED
    ).order_by(models.Review.created_at.desc()).all()

    return {
        "reviews": reviews,
        "total_count": len(reviews),
        "average_rating": None
    }