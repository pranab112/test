from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import secrets
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app import models, schemas, auth
from app.database import get_db
from app.models import UserType, OfferType, OfferStatus, OfferClaimStatus

router = APIRouter(prefix="/email", tags=["email-verification"])

# Simple email verification (in production, use proper SMTP service)
def send_verification_email(email: str, token: str, username: str):
    """
    In production, integrate with services like SendGrid, AWS SES, etc.
    For now, this is a mock implementation that just logs the email.
    """
    verification_link = f"http://127.0.0.1:8000/email/verify?token={token}"

    print(f"""
    ===========================================
    EMAIL VERIFICATION
    ===========================================
    To: {email}
    Subject: Verify Your Email - Casino Royale

    Hello {username},

    Please click the link below to verify your email address:
    {verification_link}

    This verification link will expire in 24 hours.

    If you didn't request this verification, please ignore this email.

    Best regards,
    Casino Royale Team
    ===========================================
    """)
    return True

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

    # AUTO-CLAIM: Find active email verification offers and create pending claims
    auto_claimed = []

    # Only for players
    if user.user_type == UserType.PLAYER:
        # Find all active EMAIL_VERIFICATION offers
        email_offers = db.query(models.PlatformOffer).filter(
            models.PlatformOffer.offer_type == OfferType.EMAIL_VERIFICATION,
            models.PlatformOffer.status == OfferStatus.ACTIVE
        ).all()

        # Get player's connected clients (friends who are clients)
        for friend in user.friends:
            if friend.user_type != UserType.CLIENT:
                continue

            for offer in email_offers:
                # Check if already claimed with this client
                existing_claim = db.query(models.OfferClaim).filter(
                    models.OfferClaim.offer_id == offer.id,
                    models.OfferClaim.player_id == user.id,
                    models.OfferClaim.client_id == friend.id
                ).first()

                if existing_claim:
                    continue

                # Check max claims per player
                player_total_claims = db.query(models.OfferClaim).filter(
                    models.OfferClaim.offer_id == offer.id,
                    models.OfferClaim.player_id == user.id
                ).count()

                if player_total_claims >= offer.max_claims_per_player:
                    continue

                # Check total claims limit
                if offer.max_claims:
                    total_claims = db.query(models.OfferClaim).filter(
                        models.OfferClaim.offer_id == offer.id
                    ).count()
                    if total_claims >= offer.max_claims:
                        continue

                # Auto-create pending claim
                new_claim = models.OfferClaim(
                    offer_id=offer.id,
                    player_id=user.id,
                    client_id=friend.id,
                    bonus_amount=offer.bonus_amount,
                    verification_data=json.dumps({
                        "email": user.secondary_email,
                        "auto_claimed": True,
                        "verified_at": datetime.now(timezone.utc).isoformat()
                    }),
                    status=OfferClaimStatus.PENDING
                )
                db.add(new_claim)
                auto_claimed.append({
                    "offer_title": offer.title,
                    "bonus_amount": offer.bonus_amount,
                    "client_name": friend.company_name or friend.username
                })

    db.commit()

    # Build response message
    if auto_claimed:
        bonus_info = ", ".join([f"${c['bonus_amount']} from {c['client_name']}" for c in auto_claimed])
        message = f"Email verified successfully! Bonus claims created: {bonus_info}. Awaiting client approval."
    else:
        message = "Email verified successfully! You can now close this window."

    return {
        "message": message,
        "verified": True,
        "auto_claims_created": len(auto_claimed),
        "claims": auto_claimed
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