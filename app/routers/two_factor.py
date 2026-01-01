from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import pyotp
import secrets
import json
import qrcode
import io
import base64
from app import models, auth
from app.database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/2fa", tags=["two-factor-authentication"])


class Enable2FAResponse(BaseModel):
    secret: str
    qr_code: str
    backup_codes: list[str]


class Verify2FARequest(BaseModel):
    code: str


class Verify2FAResponse(BaseModel):
    message: str
    enabled: bool


class Disable2FARequest(BaseModel):
    code: str


class TwoFactorStatus(BaseModel):
    enabled: bool
    has_backup_codes: bool


def generate_backup_codes(count: int = 10) -> list[str]:
    """Generate a list of backup codes for 2FA recovery"""
    return [secrets.token_hex(4).upper() for _ in range(count)]


def generate_qr_code(secret: str, username: str, issuer: str = "GoldenAce") -> str:
    """Generate a QR code for TOTP setup and return as base64 data URL"""
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=username,
        issuer_name=issuer
    )

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(totp_uri)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_base64}"


@router.get("/status", response_model=TwoFactorStatus)
async def get_2fa_status(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current 2FA status for the user"""
    has_backup_codes = bool(current_user.two_factor_backup_codes)

    return TwoFactorStatus(
        enabled=current_user.two_factor_enabled,
        has_backup_codes=has_backup_codes
    )


@router.post("/setup", response_model=Enable2FAResponse)
async def setup_2fa(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Initialize 2FA setup - generates secret and QR code"""
    if current_user.two_factor_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")

    # Generate a new secret
    secret = pyotp.random_base32()

    # Generate QR code
    qr_code = generate_qr_code(secret, current_user.username)

    # Generate backup codes
    backup_codes = generate_backup_codes()

    # Store secret temporarily (will be confirmed when user verifies)
    current_user.two_factor_secret = secret
    current_user.two_factor_backup_codes = json.dumps(backup_codes)
    db.commit()

    return Enable2FAResponse(
        secret=secret,
        qr_code=qr_code,
        backup_codes=backup_codes
    )


@router.post("/verify", response_model=Verify2FAResponse)
async def verify_and_enable_2fa(
    request: Verify2FARequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Verify the TOTP code and enable 2FA"""
    if current_user.two_factor_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")

    if not current_user.two_factor_secret:
        raise HTTPException(status_code=400, detail="2FA setup not initiated. Please call /setup first")

    # Verify the code
    totp = pyotp.TOTP(current_user.two_factor_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Enable 2FA
    current_user.two_factor_enabled = True
    db.commit()

    return Verify2FAResponse(
        message="Two-factor authentication has been enabled successfully",
        enabled=True
    )


@router.post("/disable", response_model=Verify2FAResponse)
async def disable_2fa(
    request: Disable2FARequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Disable 2FA after verifying the current code"""
    if not current_user.two_factor_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled")

    # Verify the code
    totp = pyotp.TOTP(current_user.two_factor_secret)
    is_valid = totp.verify(request.code, valid_window=1)

    # Also check backup codes if TOTP fails
    if not is_valid and current_user.two_factor_backup_codes:
        backup_codes = json.loads(current_user.two_factor_backup_codes)
        if request.code.upper() in backup_codes:
            is_valid = True
            # Remove used backup code
            backup_codes.remove(request.code.upper())
            current_user.two_factor_backup_codes = json.dumps(backup_codes)

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Disable 2FA
    current_user.two_factor_enabled = False
    current_user.two_factor_secret = None
    current_user.two_factor_backup_codes = None
    db.commit()

    return Verify2FAResponse(
        message="Two-factor authentication has been disabled",
        enabled=False
    )


@router.post("/validate")
async def validate_2fa_code(
    request: Verify2FARequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Validate a 2FA code (for login verification)"""
    if not current_user.two_factor_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled for this account")

    # Verify the code
    totp = pyotp.TOTP(current_user.two_factor_secret)
    is_valid = totp.verify(request.code, valid_window=1)

    # Also check backup codes if TOTP fails
    used_backup_code = False
    if not is_valid and current_user.two_factor_backup_codes:
        backup_codes = json.loads(current_user.two_factor_backup_codes)
        if request.code.upper() in backup_codes:
            is_valid = True
            used_backup_code = True
            # Remove used backup code
            backup_codes.remove(request.code.upper())
            current_user.two_factor_backup_codes = json.dumps(backup_codes)
            db.commit()

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    return {
        "valid": True,
        "used_backup_code": used_backup_code,
        "message": "Code verified successfully"
    }


@router.post("/regenerate-backup-codes")
async def regenerate_backup_codes(
    request: Verify2FARequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Regenerate backup codes after verifying current 2FA code"""
    if not current_user.two_factor_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled")

    # Verify the code first
    totp = pyotp.TOTP(current_user.two_factor_secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Generate new backup codes
    new_backup_codes = generate_backup_codes()
    current_user.two_factor_backup_codes = json.dumps(new_backup_codes)
    db.commit()

    return {
        "message": "Backup codes regenerated successfully",
        "backup_codes": new_backup_codes
    }
