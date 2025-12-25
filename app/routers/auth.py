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
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username exists
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already taken")

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

    # Set approval status - Clients need admin approval, others are auto-approved
    is_approved = user.user_type != models.UserType.CLIENT

    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        full_name=user.full_name,
        user_type=user.user_type,
        user_id=user_id,
        is_approved=is_approved,
        company_name=user.company_name if user.user_type == models.UserType.CLIENT else None
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user

@router.post("/login", response_model=schemas.Token)
@conditional_rate_limit(RateLimits.LOGIN)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if user is None:
        # Client account pending approval
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval. Please wait for admin approval.",
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