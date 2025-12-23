from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import secrets
import random
import os
import resend
from app import models, schemas, auth
from app.database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["email-verification"])

# Get base URL from environment (defaults to localhost for development)
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")

# Resend Configuration (new email service)
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "onboarding@resend.dev")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Casino Royal")


def generate_otp() -> str:
    """Generate a 6-digit OTP code"""
    return str(random.randint(100000, 999999))


def send_otp_email(email: str, otp: str, username: str):
    """
    Send OTP verification email using Resend.
    Falls back to console logging if Resend API key is not configured.
    """

    # Email content
    subject = "Your Casino Royal Verification Code"

    # HTML email body for Resend
    html_body = f"""<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .otp-code {{
            background: #f0f0f0;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 32px;
            font-weight: bold;
            color: #333;
            padding: 20px;
            text-align: center;
            letter-spacing: 8px;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h2>Hi {username},</h2>
        <p>Your Casino Royal verification code is:</p>
        <div class="otp-code">{otp}</div>
        <p><strong>This code will expire in 10 minutes.</strong></p>
        <p>If you didn't request this code, please ignore this email.</p>
        <br>
        <p>Best regards,<br>Casino Royal Team</p>
    </div>
</body>
</html>"""

    # Check if Resend API key is configured
    if not RESEND_API_KEY:
        # Fallback to console logging for development
        logger.warning("Resend API key not configured. Logging OTP to console.")
        print(f"""
===========================================
EMAIL VERIFICATION OTP (DEV MODE)
===========================================
To: {email}
Subject: {subject}
OTP Code: {otp}
Expires in: 10 minutes
===========================================
        """)
        return True

    try:
        # Set Resend API key
        resend.api_key = RESEND_API_KEY

        # Send email via Resend
        params = {
            "from": f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>",
            "to": [email],
            "subject": subject,
            "html": html_body,
        }

        response = resend.Emails.send(params)

        logger.info(f"OTP email sent to {email} via Resend. ID: {response.get('id', 'N/A')}")
        return True

    except Exception as e:
        logger.error(f"Resend Error: {str(e)}")

        # Log to console as fallback
        print(f"""
===========================================
EMAIL VERIFICATION OTP (RESEND ERROR - LOGGED TO CONSOLE)
===========================================
Error: {str(e)}
To: {email}
Subject: {subject}
OTP Code: {otp}
===========================================
        """)

        # Still return True to not block user registration
        # The OTP is logged and can be retrieved from logs
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
        send_otp_email(request.email, otp, current_user.username)
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
        send_otp_email(current_user.secondary_email, otp, current_user.username)
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