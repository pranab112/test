"""
Referral System API Endpoints

Allows users to:
- Generate their unique referral code
- View their referral statistics
- View list of people they referred
- Track referral bonus earnings (500 credits per successful referral)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import random
import string

from app import models, auth
from app.database import get_db
from app.schemas.referral import (
    ReferralCodeResponse,
    ReferralStatsResponse,
    ReferralListResponse,
    ReferredUserInfo,
    ReferralResponse
)
from app.models import ReferralStatus, REFERRAL_BONUS_CREDITS
from app.config import settings

router = APIRouter(prefix="/referrals", tags=["referrals"])


def generate_referral_code(length: int = 8) -> str:
    """Generate a unique referral code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))


def get_referral_link(referral_code: str) -> str:
    """Generate the full referral link using APP_URL from settings"""
    # Use APP_URL from env/settings - this should be the frontend URL
    app_url = settings.APP_URL.rstrip('/')
    # Ensure https:// prefix if it's a domain without protocol
    if not app_url.startswith('http://') and not app_url.startswith('https://'):
        app_url = f"https://{app_url}"
    return f"{app_url}/register?ref={referral_code}"


@router.get("/my-code", response_model=ReferralCodeResponse)
async def get_my_referral_code(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's referral code.
    If they don't have one yet, generate and save it.
    """
    if not current_user.referral_code:
        # Generate a unique referral code
        referral_code = generate_referral_code()

        # Ensure uniqueness
        while db.query(models.User).filter(
            models.User.referral_code == referral_code
        ).first():
            referral_code = generate_referral_code()

        current_user.referral_code = referral_code
        db.commit()
        db.refresh(current_user)

    return ReferralCodeResponse(
        referral_code=current_user.referral_code,
        referral_link=get_referral_link(current_user.referral_code)
    )


@router.post("/generate-code", response_model=ReferralCodeResponse)
async def regenerate_referral_code(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate a new referral code for the current user.
    This will replace their existing code.
    """
    referral_code = generate_referral_code()

    # Ensure uniqueness
    while db.query(models.User).filter(
        models.User.referral_code == referral_code
    ).first():
        referral_code = generate_referral_code()

    current_user.referral_code = referral_code
    db.commit()
    db.refresh(current_user)

    return ReferralCodeResponse(
        referral_code=current_user.referral_code,
        referral_link=get_referral_link(current_user.referral_code)
    )


@router.get("/stats", response_model=ReferralStatsResponse)
async def get_referral_stats(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get referral statistics for the current user.
    Shows total referrals, completed ones, and total credits earned.
    """
    # Count total referrals
    total_referrals = db.query(models.Referral).filter(
        models.Referral.referrer_id == current_user.id
    ).count()

    # Count completed referrals (bonus credited)
    completed_referrals = db.query(models.Referral).filter(
        models.Referral.referrer_id == current_user.id,
        models.Referral.status == ReferralStatus.COMPLETED
    ).count()

    # Count pending referrals
    pending_referrals = db.query(models.Referral).filter(
        models.Referral.referrer_id == current_user.id,
        models.Referral.status == ReferralStatus.PENDING
    ).count()

    # Calculate total credits earned
    total_credits = db.query(func.sum(models.Referral.bonus_amount)).filter(
        models.Referral.referrer_id == current_user.id,
        models.Referral.status == ReferralStatus.COMPLETED
    ).scalar() or 0

    return ReferralStatsResponse(
        total_referrals=total_referrals,
        completed_referrals=completed_referrals,
        pending_referrals=pending_referrals,
        total_credits_earned=total_credits,
        referral_code=current_user.referral_code
    )


@router.get("/list", response_model=ReferralListResponse)
async def get_referral_list(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a list of all users referred by the current user.
    """
    referrals = db.query(models.Referral).filter(
        models.Referral.referrer_id == current_user.id
    ).order_by(models.Referral.created_at.desc()).all()

    # Build response with referred user info
    referred_users = []
    total_credits = 0

    for referral in referrals:
        referred_user = db.query(models.User).filter(
            models.User.id == referral.referred_id
        ).first()

        if referred_user:
            referred_users.append(ReferredUserInfo(
                id=referred_user.id,
                username=referred_user.username,
                full_name=referred_user.full_name,
                status=referral.status,
                created_at=referral.created_at,
                completed_at=referral.completed_at,
                bonus_amount=referral.bonus_amount
            ))

            if referral.status == ReferralStatus.COMPLETED:
                total_credits += referral.bonus_amount

    return ReferralListResponse(
        referrals=referred_users,
        total_count=len(referred_users),
        total_credits_earned=total_credits
    )


@router.get("/bonus-info")
async def get_referral_bonus_info():
    """
    Get information about the referral bonus program.
    Public endpoint - no authentication required.
    """
    return {
        "bonus_per_referral": REFERRAL_BONUS_CREDITS,
        "description": f"Earn {REFERRAL_BONUS_CREDITS} credits for each person you refer who completes registration!",
        "how_it_works": [
            "1. Get your unique referral code from /referrals/my-code",
            "2. Share your referral code or link with friends",
            "3. When they register using your code and get approved, you earn credits!",
            "4. Credits are automatically added to your account"
        ]
    }


def process_referral_bonus(db: Session, referred_user: models.User) -> bool:
    """
    Process referral bonus when a referred user gets approved.
    This function should be called when approving a user.

    Returns True if bonus was credited, False otherwise.
    """
    # Find the referral record for this user
    referral = db.query(models.Referral).filter(
        models.Referral.referred_id == referred_user.id,
        models.Referral.status == ReferralStatus.PENDING
    ).first()

    if not referral:
        return False

    # Get the referrer
    referrer = db.query(models.User).filter(
        models.User.id == referral.referrer_id
    ).first()

    if not referrer:
        return False

    # Credit the bonus to the referrer
    referrer.credits = (referrer.credits or 0) + referral.bonus_amount

    # Update referral status
    referral.status = ReferralStatus.COMPLETED
    referral.completed_at = func.now()

    db.commit()

    return True
