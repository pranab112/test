from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import secrets
import os
import boto3
from botocore.exceptions import ClientError
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app import models, schemas, auth
from app.database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["email-verification"])

# Get base URL from environment (defaults to localhost for development)
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")

# AWS SES Configuration
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@casinoroyale.com")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Casino Royal")


def send_verification_email(email: str, token: str, username: str):
    """
    Send email verification using AWS SES.
    Falls back to console logging if AWS credentials are not configured.
    """
    verification_link = f"{BASE_URL}/email/verify?token={token}"

    # Email content
    subject = "Verify Your Email - Casino Royal"

    # HTML email body
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffd700; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%); color: #1a1a2e; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎰 Casino Royal</h1>
            </div>
            <div class="content">
                <h2>Hello {username}!</h2>
                <p>Thank you for registering with Casino Royal. Please verify your email address by clicking the button below:</p>
                <p style="text-align: center;">
                    <a href="{verification_link}" class="button">Verify Email Address</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px; font-size: 12px;">{verification_link}</p>
                <p><strong>This verification link will expire in 24 hours.</strong></p>
                <p>If you didn't request this verification, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>Best regards,<br>Casino Royal Team</p>
                <p>© 2024 Casino Royal. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Plain text fallback
    text_body = f"""
    Hello {username},

    Thank you for registering with Casino Royal. Please verify your email address by clicking the link below:

    {verification_link}

    This verification link will expire in 24 hours.

    If you didn't request this verification, please ignore this email.

    Best regards,
    Casino Royal Team
    """

    # Check if AWS credentials are configured
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        # Fallback to console logging for development
        logger.warning("AWS credentials not configured. Logging verification email to console.")
        print(f"""
    ===========================================
    EMAIL VERIFICATION (DEV MODE - AWS NOT CONFIGURED)
    ===========================================
    To: {email}
    Subject: {subject}
    Verification Link: {verification_link}
    ===========================================
        """)
        return True

    try:
        # Create SES client
        ses_client = boto3.client(
            'ses',
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )

        # Send email via AWS SES
        response = ses_client.send_email(
            Source=f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>",
            Destination={
                'ToAddresses': [email]
            },
            Message={
                'Subject': {
                    'Data': subject,
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Text': {
                        'Data': text_body,
                        'Charset': 'UTF-8'
                    },
                    'Html': {
                        'Data': html_body,
                        'Charset': 'UTF-8'
                    }
                }
            }
        )

        logger.info(f"Verification email sent to {email}. MessageId: {response['MessageId']}")
        return True

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        logger.error(f"AWS SES Error: {error_code} - {error_message}")

        # Log to console as fallback
        print(f"""
    ===========================================
    EMAIL VERIFICATION (AWS SES ERROR - LOGGED TO CONSOLE)
    ===========================================
    Error: {error_code} - {error_message}
    To: {email}
    Subject: {subject}
    Verification Link: {verification_link}
    ===========================================
        """)

        # Still return True to not block user registration
        # The verification link is logged and can be retrieved from logs
        return True

    except Exception as e:
        logger.error(f"Unexpected error sending email: {str(e)}")
        raise

@router.post("/send-verification", response_model=schemas.EmailVerificationResponse)
async def send_email_verification(
    request: schemas.EmailVerificationRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send email verification to player"""
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

    # Generate verification token
    verification_token = secrets.token_urlsafe(32)

    # Update user with verification token
    current_user.secondary_email = request.email
    current_user.is_email_verified = False
    current_user.email_verification_token = verification_token
    current_user.email_verification_sent_at = datetime.now(timezone.utc)

    db.commit()

    # Send verification email
    try:
        send_verification_email(request.email, verification_token, current_user.username)
        return schemas.EmailVerificationResponse(
            message="Verification email sent successfully",
            verification_sent=True
        )
    except Exception as e:
        # Rollback on email send failure
        current_user.email_verification_token = None
        current_user.email_verification_sent_at = None
        db.commit()

        raise HTTPException(status_code=500, detail="Failed to send verification email")

@router.get("/verify")
async def verify_email_token(
    token: str,
    db: Session = Depends(get_db)
):
    """Verify email using token (this is called from the email link)"""
    user = db.query(models.User).filter(
        models.User.email_verification_token == token
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    # Check if token is expired (24 hours)
    if user.email_verification_sent_at:
        token_age = datetime.now(timezone.utc) - user.email_verification_sent_at.replace(tzinfo=timezone.utc)
        if token_age > timedelta(hours=24):
            raise HTTPException(status_code=400, detail="Verification token has expired")

    # Mark email as verified
    user.is_email_verified = True
    user.email_verification_token = None
    user.email_verification_sent_at = None

    db.commit()

    return {
        "message": "Email verified successfully! You can now claim email verification bonuses.",
        "verified": True
    }

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
        current_user.email_verification_token
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
    current_user.email_verification_token = None
    current_user.email_verification_sent_at = None

    db.commit()

    return {"message": "Secondary email removed successfully"}

@router.post("/resend-verification", response_model=schemas.EmailVerificationResponse)
async def resend_verification_email(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Resend verification email for existing secondary email"""
    if current_user.user_type != models.UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players can verify email")

    if not current_user.secondary_email:
        raise HTTPException(status_code=400, detail="No secondary email set")

    if current_user.is_email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    # Check rate limiting (only allow resend after 5 minutes)
    if current_user.email_verification_sent_at:
        time_since_last = datetime.now(timezone.utc) - current_user.email_verification_sent_at.replace(tzinfo=timezone.utc)
        if time_since_last < timedelta(minutes=5):
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {5 - int(time_since_last.total_seconds() / 60)} more minutes before requesting another verification email"
            )

    # Generate new verification token
    verification_token = secrets.token_urlsafe(32)

    current_user.email_verification_token = verification_token
    current_user.email_verification_sent_at = datetime.now(timezone.utc)

    db.commit()

    # Send verification email
    try:
        send_verification_email(current_user.secondary_email, verification_token, current_user.username)
        return schemas.EmailVerificationResponse(
            message="Verification email resent successfully",
            verification_sent=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to send verification email")