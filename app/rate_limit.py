"""
Rate limiting configuration using SlowAPI
Can be toggled on/off using ENABLE_RATE_LIMITING environment variable
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from app.config import settings
import logging
from functools import wraps
from typing import Optional

logger = logging.getLogger(__name__)


def get_real_client_ip(request: Request) -> str:
    """
    Get the real client IP, considering proxy headers

    Priority:
    1. X-Forwarded-For (if behind proxy)
    2. X-Real-IP (alternative proxy header)
    3. Remote address (direct connection)
    """
    # Check for proxy headers (in production, behind load balancer)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one
        return forwarded_for.split(",")[0].strip()

    # Check X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # Fallback to direct connection IP
    if request.client:
        return request.client.host

    return "127.0.0.1"  # Default fallback


# Initialize limiter with custom key function
limiter = Limiter(
    key_func=get_real_client_ip,
    default_limits=["1000 per hour"] if settings.ENABLE_RATE_LIMITING else [],
    enabled=settings.ENABLE_RATE_LIMITING,
    swallow_errors=True,  # Don't break the app if rate limiting fails
)


def conditional_rate_limit(limit_string: str):
    """
    Decorator that applies rate limiting only if enabled via feature flag

    Usage:
        @conditional_rate_limit("5/minute")
        def my_endpoint():
            ...
    """
    def decorator(func):
        if settings.ENABLE_RATE_LIMITING:
            # Apply rate limiting
            return limiter.limit(limit_string)(func)
        else:
            # No rate limiting - return function as-is
            return func
    return decorator


def user_based_limit(request: Request) -> str:
    """
    Get rate limit key based on authenticated user ID
    Falls back to IP if user not authenticated
    """
    # Try to get user from request state (set by auth middleware)
    if hasattr(request.state, "user") and request.state.user:
        return f"user:{request.state.user.id}"

    # Fall back to IP-based limiting
    return get_real_client_ip(request)


def get_rate_limiter() -> Optional[Limiter]:
    """Get the rate limiter instance if enabled, None otherwise"""
    return limiter if settings.ENABLE_RATE_LIMITING else None


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Custom handler for rate limit exceeded errors

    Returns a consistent error response with retry information
    """
    response = JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded",
            "message": f"Too many requests. {exc.detail}",
            "retry_after": exc.headers.get("Retry-After", "60")
        }
    )
    # Add standard rate limit headers
    response.headers.update(exc.headers)
    return response


def setup_rate_limiting(app: FastAPI):
    """
    Setup rate limiting for the FastAPI app

    This should be called in main.py after app initialization
    """
    if not settings.ENABLE_RATE_LIMITING:
        logger.info("Rate limiting is DISABLED")
        return

    logger.info("Rate limiting is ENABLED")

    # Add the limiter to app state
    app.state.limiter = limiter

    # Add rate limit exceeded handler
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # Log rate limit configuration
    logger.info(f"Default rate limit: 1000 per hour")
    logger.info("Rate limiting configured successfully")


# Pre-configured rate limit decorators for common use cases
class RateLimits:
    """Common rate limit configurations"""

    # Authentication endpoints
    LOGIN = "5/minute"  # Prevent brute force attacks
    REGISTER = "3/hour"  # Prevent spam accounts
    PASSWORD_RESET = "3/hour"  # Prevent abuse

    # Messaging endpoints
    SEND_MESSAGE = "60/minute"  # Prevent spam
    SEND_IMAGE = "10/minute"  # Heavier operation
    SEND_VOICE = "10/minute"  # Heavier operation

    # Social features
    FRIEND_REQUEST = "20/hour"  # Prevent spam
    REVIEW_POST = "10/day"  # Prevent review bombing
    REPORT_POST = "5/day"  # Prevent false reports

    # Game operations
    CREATE_CREDENTIALS = "30/hour"  # Reasonable for clients
    CLAIM_PROMOTION = "10/minute"  # Prevent abuse

    # Read operations (higher limits)
    READ_HEAVY = "100/minute"  # For expensive queries
    READ_NORMAL = "300/minute"  # For normal queries
    READ_LIGHT = "1000/minute"  # For cached/light queries

    # Admin operations (no limit or very high)
    ADMIN = "10000/hour"  # Essentially no limit

    @staticmethod
    def for_user_type(user_type: str) -> str:
        """Get rate limit based on user type"""
        limits = {
            "ADMIN": "10000/hour",  # Essentially unlimited
            "CLIENT": "5000/hour",  # Higher limit for clients
            "PLAYER": "1000/hour",  # Standard limit for players
        }
        return limits.get(user_type, "500/hour")  # Default for unknown


# Example usage in routers:
"""
from app.rate_limit import conditional_rate_limit, RateLimits

@router.post("/login")
@conditional_rate_limit(RateLimits.LOGIN)
def login():
    ...

@router.post("/messages/send")
@conditional_rate_limit(RateLimits.SEND_MESSAGE)
def send_message():
    ...
"""