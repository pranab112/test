from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import secrets
import random
import os
from app import models, schemas, auth
from app.database import get_db
from app.config import settings
from app.services import send_otp_email as smtp_send_otp_email, generate_otp as service_generate_otp
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["email-verification"])

# Progressive rate limiting cooldowns (in seconds)
# 1st resend: 1 minute, 2nd: 10 minutes, 3rd: 1 hour, 4th+: 24 hours
RESEND_COOLDOWNS = [
    60,        # 1 minute (after 1st send)
    600,       # 10 minutes (after 2nd send)
    3600,      # 1 hour (after 3rd send)
    86400,     # 24 hours (after 4th+ send)
]


def get_cooldown_for_resend_count(count: int) -> int:
    """Get the cooldown duration in seconds based on resend count."""
    if count <= 0:
        return RESEND_COOLDOWNS[0]
    index = min(count - 1, len(RESEND_COOLDOWNS) - 1)
    return RESEND_COOLDOWNS[index]


def generate_otp() -> str:
    """Generate a 6-digit OTP code"""
    return service_generate_otp(6)


def send_otp_email_handler(email: str, otp: str, username: str) -> bool:
    """
    Send OTP verification email using Resend API.
    Falls back to console logging if Resend is not configured.

    This function is designed to NEVER raise exceptions - it always returns True/False.
    """
    try:
        # Try to send via Resend if configured
        if settings.resend_configured:
            success = smtp_send_otp_email(email, otp, username)
            if success:
                logger.info(f"OTP email sent to {email} via Resend")
                return True
            else:
                logger.warning(f"Resend send failed for {email}, falling back to console")

        # Fallback to console logging for development or if Resend fails
        logger.warning("Resend not configured or failed. Logging OTP to console.")
        print(f"""
===========================================
EMAIL VERIFICATION OTP (DEV MODE)
===========================================
To: {email}
Subject: Your {settings.RESEND_FROM_NAME} Verification Code
OTP Code: {otp}
Expires in: 10 minutes
===========================================
        """)
        return True
    except Exception as e:
        # Catch any unexpected errors and log them
        logger.error(f"Unexpected error in send_otp_email_handler: {type(e).__name__}: {e}")
        # Still return True since we want the OTP flow to continue (user can see OTP in console)
        print(f"""
===========================================
EMAIL VERIFICATION OTP (FALLBACK - Error occurred)
===========================================
To: {email}
Subject: Your {settings.RESEND_FROM_NAME} Verification Code
OTP Code: {otp}
Expires in: 10 minutes
===========================================
        """)
        return True


def check_rate_limit(user: models.User) -> tuple[bool, int]:
    """
    Check if user can resend OTP based on progressive rate limiting.

    Returns:
        tuple: (can_resend: bool, seconds_remaining: int)
    """
    if not user.email_otp_last_resend_at:
        return True, 0

    resend_count = user.email_otp_resend_count or 0
    cooldown = get_cooldown_for_resend_count(resend_count)

    last_resend = user.email_otp_last_resend_at
    if last_resend.tzinfo is None:
        last_resend = last_resend.replace(tzinfo=timezone.utc)

    next_allowed = last_resend + timedelta(seconds=cooldown)
    now = datetime.now(timezone.utc)

    if now >= next_allowed:
        return True, 0

    seconds_remaining = int((next_allowed - now).total_seconds())
    return False, seconds_remaining


def format_cooldown_message(seconds: int) -> str:
    """Format cooldown seconds into human-readable message."""
    if seconds < 60:
        return f"Please wait {seconds} seconds before requesting another code"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"Please wait {minutes} minute{'s' if minutes > 1 else ''} before requesting another code"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"Please wait {hours} hour{'s' if hours > 1 else ''} before requesting another code"
    else:
        hours = seconds // 3600
        return f"Please wait {hours} hours before requesting another code"


@router.post("/send-otp", response_model=schemas.EmailVerificationResponse)
async def send_otp_verification(
    request: schemas.EmailVerificationRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send OTP verification code to player's email"""
    if current_user.user_type != models.UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players can verify email")

    # Check if email is already used by another user
    existing_user = db.query(models.User).filter(
        models.User.email == request.email
    ).first()

    if existing_user and existing_user.id != current_user.id:
        raise HTTPException(status_code=400, detail="Email already in use by another account")

    # Check if secondary email is already used
    existing_secondary = db.query(models.User).filter(
        models.User.secondary_email == request.email,
        models.User.id != current_user.id
    ).first()

    if existing_secondary:
        raise HTTPException(status_code=400, detail="Email already in use as secondary email")

    # Check progressive rate limiting
    can_resend, seconds_remaining = check_rate_limit(current_user)
    if not can_resend:
        raise HTTPException(
            status_code=429,
            detail=format_cooldown_message(seconds_remaining)
        )

    # Generate new OTP
    otp = generate_otp()

    # Update user with OTP
    current_user.secondary_email = request.email
    current_user.email_otp = otp
    current_user.email_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    current_user.is_email_verified = False

    # Update resend tracking
    current_user.email_otp_resend_count = (current_user.email_otp_resend_count or 0) + 1
    current_user.email_otp_last_resend_at = datetime.now(timezone.utc)

    db.commit()

    # Send OTP email
    try:
        send_otp_email_handler(request.email, otp, current_user.username)
        return schemas.EmailVerificationResponse(
            message="Verification code sent successfully. Check your email.",
            verification_sent=True
        )
    except Exception as e:
        # Rollback on email send failure
        current_user.email_otp = None
        current_user.email_otp_expires_at = None
        db.commit()

        raise HTTPException(status_code=500, detail="Failed to send verification email")


@router.post("/verify-otp")
async def verify_otp(
    request: schemas.OTPVerificationRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Verify email using OTP code"""
    if current_user.user_type != models.UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players can verify email")

    # Check if user has pending OTP
    if not current_user.email_otp:
        raise HTTPException(status_code=400, detail="No verification code requested")

    # Check if OTP is expired
    if current_user.email_otp_expires_at:
        expires_at = current_user.email_otp_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")

    # Verify OTP
    if current_user.email_otp != request.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Mark email as verified and reset resend counter
    current_user.is_email_verified = True
    current_user.email_otp = None
    current_user.email_otp_expires_at = None
    current_user.email_otp_resend_count = 0  # Reset counter on successful verification
    current_user.email_otp_last_resend_at = None

    db.commit()

    return {
        "message": "Email verified successfully! You can now claim email verification bonuses.",
        "verified": True
    }


@router.post("/resend-otp", response_model=schemas.EmailVerificationResponse)
async def resend_otp(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Resend OTP verification code with progressive rate limiting"""
    if current_user.user_type != models.UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players can verify email")

    if not current_user.secondary_email:
        raise HTTPException(status_code=400, detail="No email address set for verification")

    if current_user.is_email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    # Check progressive rate limiting
    can_resend, seconds_remaining = check_rate_limit(current_user)
    if not can_resend:
        raise HTTPException(
            status_code=429,
            detail=format_cooldown_message(seconds_remaining)
        )

    # Generate new OTP
    otp = generate_otp()

    current_user.email_otp = otp
    current_user.email_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Update resend tracking
    current_user.email_otp_resend_count = (current_user.email_otp_resend_count or 0) + 1
    current_user.email_otp_last_resend_at = datetime.now(timezone.utc)

    db.commit()

    # Send OTP email
    try:
        send_otp_email_handler(current_user.secondary_email, otp, current_user.username)
        return schemas.EmailVerificationResponse(
            message="New verification code sent successfully",
            verification_sent=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to send verification email")


@router.get("/status", response_model=schemas.EmailStatusResponse)
async def get_email_verification_status(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current email verification status including resend cooldown info"""
    if current_user.user_type != models.UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players have email verification")

    verification_pending = bool(
        current_user.secondary_email and
        not current_user.is_email_verified and
        current_user.email_otp
    )

    # Calculate cooldown info
    resend_count = current_user.email_otp_resend_count or 0
    can_resend, seconds_remaining = check_rate_limit(current_user)

    next_resend_at = None
    if not can_resend and current_user.email_otp_last_resend_at:
        cooldown = get_cooldown_for_resend_count(resend_count)
        last_resend = current_user.email_otp_last_resend_at
        if last_resend.tzinfo is None:
            last_resend = last_resend.replace(tzinfo=timezone.utc)
        next_resend_at = (last_resend + timedelta(seconds=cooldown)).isoformat()

    return schemas.EmailStatusResponse(
        secondary_email=current_user.secondary_email,
        is_email_verified=current_user.is_email_verified,
        verification_pending=verification_pending,
        resend_count=resend_count,
        next_resend_available_at=next_resend_at,
        cooldown_seconds=seconds_remaining
    )


@router.delete("/remove")
async def remove_secondary_email(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Remove secondary email and verification status"""
    if current_user.user_type != models.UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players can modify email verification")

    current_user.secondary_email = None
    current_user.is_email_verified = False
    current_user.email_otp = None
    current_user.email_otp_expires_at = None
    current_user.email_verification_token = None
    current_user.email_verification_sent_at = None
    current_user.email_otp_resend_count = 0  # Reset counter
    current_user.email_otp_last_resend_at = None

    db.commit()

    return {"message": "Secondary email removed successfully"}
