"""
Custom exceptions and error handlers for the application
"""
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError, DataError, OperationalError
from pydantic import BaseModel
from typing import Any, Dict, Optional
import logging
import traceback

logger = logging.getLogger(__name__)


# ============= Custom Exception Classes =============

class CasinoRoyalException(HTTPException):
    """Base exception for all custom exceptions"""
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code


class DatabaseError(CasinoRoyalException):
    """Database operation failed"""
    def __init__(self, detail: str = "Database operation failed", error_code: str = "DB_ERROR"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code=error_code
        )


class NotFoundError(CasinoRoyalException):
    """Resource not found"""
    def __init__(self, resource: str = "Resource", error_code: str = "NOT_FOUND"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found",
            error_code=error_code
        )


class ForbiddenError(CasinoRoyalException):
    """Access forbidden"""
    def __init__(self, detail: str = "Access forbidden", error_code: str = "FORBIDDEN"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code=error_code
        )


class UnauthorizedError(CasinoRoyalException):
    """Authentication required"""
    def __init__(self, detail: str = "Authentication required", error_code: str = "UNAUTHORIZED"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code=error_code,
            headers={"WWW-Authenticate": "Bearer"}
        )


class ValidationError(CasinoRoyalException):
    """Validation failed"""
    def __init__(self, detail: str, error_code: str = "VALIDATION_ERROR"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code=error_code
        )


class DuplicateError(CasinoRoyalException):
    """Resource already exists"""
    def __init__(self, resource: str, error_code: str = "DUPLICATE"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{resource} already exists",
            error_code=error_code
        )


class BusinessLogicError(CasinoRoyalException):
    """Business logic violation"""
    def __init__(self, detail: str, error_code: str = "BUSINESS_ERROR"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code=error_code
        )


class RateLimitError(CasinoRoyalException):
    """Rate limit exceeded"""
    def __init__(self, detail: str = "Rate limit exceeded", retry_after: int = 60):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            error_code="RATE_LIMIT",
            headers={"Retry-After": str(retry_after)}
        )


class InsufficientFundsError(CasinoRoyalException):
    """Insufficient funds for operation"""
    def __init__(self, detail: str = "Insufficient funds", error_code: str = "INSUFFICIENT_FUNDS"):
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=detail,
            error_code=error_code
        )


# ============= Error Handlers =============

async def custom_exception_handler(request: Request, exc: CasinoRoyalException) -> JSONResponse:
    """Handle custom exceptions"""
    logger.warning(
        f"Custom exception: {exc.error_code} - {exc.detail} - Path: {request.url.path}",
        extra={
            "error_code": exc.error_code,
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method
        }
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.detail,
                "status": exc.status_code
            }
        },
        headers=exc.headers
    )


async def database_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle all database errors"""
    error_id = logger.error(
        f"Database error: {str(exc)}",
        exc_info=True,
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_type": type(exc).__name__
        }
    )

    # Handle specific database errors
    if isinstance(exc, IntegrityError):
        # Parse the error to provide better messages
        error_str = str(exc.orig) if hasattr(exc, 'orig') else str(exc)

        if "UNIQUE constraint failed" in error_str or "duplicate key" in error_str:
            # Extract field name if possible
            if "users.email" in error_str:
                message = "Email address already registered"
                error_code = "DUPLICATE_EMAIL"
            elif "users.username" in error_str:
                message = "Username already taken"
                error_code = "DUPLICATE_USERNAME"
            else:
                message = "Resource already exists"
                error_code = "DUPLICATE_RESOURCE"

            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={
                    "error": {
                        "code": error_code,
                        "message": message,
                        "status": 409
                    }
                }
            )

        if "FOREIGN KEY constraint failed" in error_str or "foreign key constraint" in error_str:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": {
                        "code": "INVALID_REFERENCE",
                        "message": "Referenced resource does not exist",
                        "status": 400
                    }
                }
            )

        if "NOT NULL constraint failed" in error_str or "null value in column" in error_str:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": {
                        "code": "MISSING_REQUIRED_FIELD",
                        "message": "Required field is missing",
                        "status": 400
                    }
                }
            )

    if isinstance(exc, DataError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": {
                    "code": "INVALID_DATA",
                    "message": "Invalid data format",
                    "status": 400
                }
            }
        )

    if isinstance(exc, OperationalError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Database temporarily unavailable",
                    "status": 503
                }
            }
        )

    # Generic database error
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "DATABASE_ERROR",
                "message": "Database operation failed",
                "status": 500
            }
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors"""
    errors = []
    for error in exc.errors():
        field_path = " -> ".join(str(x) for x in error["loc"] if x != "body")
        errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"]
        })

    logger.warning(
        f"Validation error: {request.url.path}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": errors
        }
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "status": 422,
                "details": errors
            }
        }
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions"""
    logger.warning(
        f"HTTP exception: {exc.status_code} - {exc.detail} - Path: {request.url.path}",
        extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method
        }
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail or "An error occurred",
                "status": exc.status_code
            }
        }
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unexpected errors"""
    error_trace = traceback.format_exc()
    logger.error(
        f"Unhandled exception: {str(exc)}",
        exc_info=True,
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_type": type(exc).__name__,
            "traceback": error_trace
        }
    )

    # Don't expose internal errors in production
    if hasattr(request.app.state, "settings") and request.app.state.settings.is_production:
        message = "An internal error occurred"
    else:
        message = f"Internal error: {str(exc)}"

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": message,
                "status": 500
            }
        }
    )


def setup_exception_handlers(app):
    """
    Setup all exception handlers for the FastAPI app

    This should be called in main.py after app initialization
    """
    from fastapi.exceptions import RequestValidationError
    from starlette.exceptions import HTTPException as StarletteHTTPException

    # Register exception handlers
    app.add_exception_handler(CasinoRoyalException, custom_exception_handler)
    app.add_exception_handler(SQLAlchemyError, database_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    logger.info("Exception handlers configured successfully")


# ============= Error Response Models =============

class ErrorDetail(BaseModel):
    """Error detail model"""
    field: Optional[str] = None
    message: str
    type: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: Dict[str, Any]

    class Config:
        schema_extra = {
            "example": {
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "status": 422,
                    "details": [
                        {
                            "field": "email",
                            "message": "Invalid email format",
                            "type": "value_error"
                        }
                    ]
                }
            }
        }