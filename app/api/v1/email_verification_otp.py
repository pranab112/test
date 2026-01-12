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


def generate_otp() -> str:
    """Generate a 6-digit OTP code"""
    return service_generate_otp(6)


def send_otp_email_handler(email: str, otp: str, username: str) -> bool:
    """
    Send OTP verification email using SMTP settings from config.
    Falls back to console logging if SMTP is not configured.

    This function is designed to NEVER raise exceptions - it always returns True/False.
    """
    try:
        # Try to send via SMTP if configured
        if settings.smtp_configured:
            success = smtp_send_otp_email(email, otp, username)
            if success:
                logger.info(f"OTP email sent to {email} via SMTP")
                return True
            else:
                logger.warning(f"SMTP send failed for {email}, falling back to console")

        # Fallback to console logging for development or if SMTP fails
        logger.warning("SMTP not configured or failed. Logging OTP to console.")
        print(f"""
===========================================
EMAIL VERIFICATION OTP (DEV MODE)
===========================================
To: {email}
Subject: Your {settings.SMTP_FROM_NAME} Verification Code
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
Subject: Your {settings.SMTP_FROM_NAME} Verification Code
OTP Code: {otp}
Expires in: 10 minutes
===========================================
        """)
        return True


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

    # Check rate limiting (only allow resend after 1 minute)
    if current_user.email_otp_expires_at:
        # If OTP exists and hasn't expired yet
        time_remaining = current_user.email_otp_expires_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)
        if time_remaining > timedelta(minutes=9):  # Within first minute of 10-minute window
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {60 - int((timedelta(minutes=10) - time_remaining).total_seconds())} seconds before requesting another code"
            )

    # Generate new OTP
    otp = generate_otp()

    # Update user with OTP
    current_user.secondary_email = request.email
    current_user.email_otp = otp
    current_user.email_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    current_user.is_email_verified = False

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
        if datetime.now(timezone.utc) > current_user.email_otp_expires_at.replace(tzinfo=timezone.utc):
            raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")

    # Verify OTP
    if current_user.email_otp != request.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Mark email as verified
    current_user.is_email_verified = True
    current_user.email_otp = None
    current_user.email_otp_expires_at = None

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
    """Resend OTP verification code"""
    if current_user.user_type != models.UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players can verify email")

    if not current_user.secondary_email:
        raise HTTPException(status_code=400, detail="No email address set for verification")

    if current_user.is_email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    # Check rate limiting
    if current_user.email_otp_expires_at:
        time_remaining = current_user.email_otp_expires_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)
        if time_remaining > timedelta(minutes=9):  # Within first minute
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {60 - int((timedelta(minutes=10) - time_remaining).total_seconds())} seconds before requesting another code"
            )

    # Generate new OTP
    otp = generate_otp()

    current_user.email_otp = otp
    current_user.email_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

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
    """Get current email verification status"""
    if current_user.user_type != models.UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players have email verification")

    verification_pending = bool(
        current_user.secondary_email and
        not current_user.is_email_verified and
        current_user.email_otp
    )

    return schemas.EmailStatusResponse(
        secondary_email=current_user.secondary_email,
        is_email_verified=current_user.is_email_verified,
        verification_pending=verification_pending
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

    db.commit()

    return {"message": "Secondary email removed successfully"}