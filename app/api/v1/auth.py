from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import random
import string
import logging
from app import models, schemas, auth
from app.database import get_db
from app.config import settings
from app.rate_limit import conditional_rate_limit, RateLimits
from app.models import ReferralStatus, REFERRAL_BONUS_CREDITS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])

def generate_user_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

@router.post("/register", response_model=schemas.UserResponse)
@conditional_rate_limit(RateLimits.REGISTER)
def register(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        if not db_user.is_approved:
            raise HTTPException(
                status_code=400,
                detail=f"An account with this email already exists and is waiting for approval. Please login after approval."
            )
        else:
            raise HTTPException(status_code=400, detail="Email already registered. Please login instead.")

    # Check if username exists
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        if not db_user.is_approved:
            raise HTTPException(
                status_code=400,
                detail=f"An account with this username already exists and is waiting for approval. Please login after approval."
            )
        else:
            raise HTTPException(status_code=400, detail="Username already taken. Please choose a different username.")

    # Create new user
    try:
        hashed_password = auth.get_password_hash(user.password)
    except ValueError as e:
        logger.warning(f"Password validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during password hashing: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Password hashing failed")
    user_id = generate_user_id()

    # Ensure unique user_id
    while db.query(models.User).filter(models.User.user_id == user_id).first():
        user_id = generate_user_id()

    # Set approval status:
    # - ADMIN: Not allowed via public registration (should be created by system/migration)
    # - CLIENT: Requires admin approval
    # - PLAYER: Self-registered players require client approval (created_by_client_id is NULL)
    if user.user_type == models.UserType.ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Admin accounts cannot be created through public registration"
        )

    # For players, find the client they want to register under
    requesting_client_id = None
    if user.user_type == models.UserType.PLAYER and user.client_identifier:
        # Search for client by username or company name
        client = db.query(models.User).filter(
            models.User.user_type == models.UserType.CLIENT,
            models.User.is_approved == True,  # Only approved clients
            (models.User.username == user.client_identifier) |
            (models.User.company_name == user.client_identifier)
        ).first()

        if not client:
            raise HTTPException(
                status_code=400,
                detail=f"Client '{user.client_identifier}' not found or not approved. Please check the username or company name."
            )

        requesting_client_id = client.id
        logger.info(f"Player registering under client: {client.username} (ID: {client.id})")
    elif user.user_type == models.UserType.PLAYER and not user.client_identifier:
        raise HTTPException(
            status_code=400,
            detail="Player registration requires a client username or company name"
        )

    # Clients and self-registered players need approval
    is_approved = user.user_type not in [models.UserType.CLIENT, models.UserType.PLAYER]

    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        full_name=user.full_name,
        user_type=user.user_type,
        user_id=user_id,
        is_approved=is_approved,
        company_name=user.company_name if user.user_type == models.UserType.CLIENT else None,
        created_by_client_id=requesting_client_id  # Set to client ID for players, None for clients
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Handle referral code if provided
    referral_code = getattr(user, "referral_code", None)
    if referral_code:
        # Find the referrer by their referral code
        referrer = db.query(models.User).filter(
            models.User.referral_code == referral_code,
            models.User.is_active == True
        ).first()

        if referrer and referrer.id != db_user.id:
            # Create a referral record (pending until user is approved)
            referral = models.Referral(
                referrer_id=referrer.id,
                referred_id=db_user.id,
                status=ReferralStatus.PENDING,
                bonus_amount=REFERRAL_BONUS_CREDITS
            )
            db.add(referral)
            db.commit()
            logger.info(f"Referral created: {referrer.username} referred {db_user.username}")

    return db_user

@router.post("/login", response_model=schemas.Token)
@conditional_rate_limit(RateLimits.LOGIN)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if user is None:
        # Account not approved - check why
        user_check = db.query(models.User).filter(models.User.username == form_data.username).first()
        if user_check and not user_check.is_approved:
            # Customize message based on user type
            if user_check.user_type == models.UserType.CLIENT:
                detail = "Your client account is waiting for admin approval. You will be notified when approved."
            elif user_check.user_type == models.UserType.PLAYER:
                detail = "Your player account is waiting for client approval. The client will review your registration request."
            else:
                detail = "Your account is waiting for approval."
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail,
            )
        # If we get here, password was correct but user is not approved (shouldn't happen)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not approved. Please contact support.",
        )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # LAZY MIGRATION: If old SHA256 hash detected, upgrade to bcrypt
    if user.hashed_password and not user.hashed_password.startswith("$2b$"):
        try:
            # Re-hash the password with bcrypt
            user.hashed_password = auth.get_password_hash(form_data.password)
            db.commit()
            logger.info(f"Upgraded password hash to bcrypt for user {user.id} ({user.username})")
        except Exception as e:
            logger.error(f"Failed to upgrade password hash for user {user.id}: {e}")
            # Continue even if migration fails - user can still log in

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "user_id": user.id, "user_type": user.user_type.value},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_type": user.user_type.value
    }

@router.get("/me", response_model=schemas.UserResponse)
async def get_current_user(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

@router.post("/change-password")
async def change_password(
    request: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change the current user's password. Requires current password verification."""
    # Verify current password
    if not auth.verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Check if new password is same as current
    if auth.verify_password(request.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    # Hash and save new password
    try:
        current_user.hashed_password = auth.get_password_hash(request.new_password)
        db.commit()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "Password changed successfully"}