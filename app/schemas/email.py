from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class EmailVerificationRequest(BaseModel):
    email: EmailStr

class EmailVerificationResponse(BaseModel):
    message: str
    verification_sent: bool

class VerifyEmailRequest(BaseModel):
    token: str

class EmailStatusResponse(BaseModel):
    secondary_email: Optional[str] = None
    is_email_verified: bool = False
    verification_pending: bool = False

class OTPVerificationRequest(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]{6}$")
