"""
Health check and monitoring endpoints
"""
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import psutil
import platform
import os
import logging
from app.database import get_db
from app.models import User, Message, Promotion, Review
from app.auth import get_current_active_user
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Basic health check endpoint

    Returns:
        Health status of the application
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }

    # Check database connectivity
    try:
        db.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        health_status["status"] = "degraded"
        health_status["database"] = "disconnected"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=health_status
        )

    return health_status


@router.get("/health/detailed")
def detailed_health_check(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Detailed health check with system metrics (requires authentication)

    Returns:
        Detailed health status including system metrics
    """
    # Only admins can access detailed health info
    if not current_user or current_user.user_type != "ADMIN":
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Admin access required"}
        )

    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
        "checks": {}
    }

    # Database check with query time
    try:
        start_time = datetime.utcnow()
        result = db.execute(text("SELECT COUNT(*) FROM users"))
        query_time = (datetime.utcnow() - start_time).total_seconds()

        health_status["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": round(query_time * 1000, 2),
            "user_count": result.scalar()
        }
    except Exception as e:
        logger.error(f"Database check failed: {e}")
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"

    # System resources
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        health_status["checks"]["system"] = {
            "status": "healthy",
            "cpu": {
                "usage_percent": cpu_percent,
                "cores": psutil.cpu_count()
            },
            "memory": {
                "usage_percent": memory.percent,
                "available_gb": round(memory.available / (1024**3), 2),
                "total_gb": round(memory.total / (1024**3), 2)
            },
            "disk": {
                "usage_percent": disk.percent,
                "free_gb": round(disk.free / (1024**3), 2),
                "total_gb": round(disk.total / (1024**3), 2)
            },
            "platform": {
                "system": platform.system(),
                "python_version": platform.python_version()
            }
        }

        # Determine if system resources are healthy
        if cpu_percent > 90 or memory.percent > 90 or disk.percent > 90:
            health_status["checks"]["system"]["status"] = "warning"
            if health_status["status"] == "healthy":
                health_status["status"] = "degraded"

    except Exception as e:
        logger.error(f"System check failed: {e}")
        health_status["checks"]["system"] = {
            "status": "unknown",
            "error": str(e)
        }

    # Application metrics
    try:
        now = datetime.utcnow()
        last_hour = now - timedelta(hours=1)
        last_day = now - timedelta(days=1)

        health_status["checks"]["application"] = {
            "status": "healthy",
            "users": {
                "total": db.query(User).count(),
                "active": db.query(User).filter(User.is_active == True).count(),
                "online": db.query(User).filter(User.is_online == True).count(),
                "registered_last_day": db.query(User).filter(
                    User.created_at >= last_day
                ).count()
            },
            "messages": {
                "total": db.query(Message).count(),
                "last_hour": db.query(Message).filter(
                    Message.created_at >= last_hour
                ).count()
            },
            "promotions": {
                "active": db.query(Promotion).filter(
                    Promotion.status == "ACTIVE"
                ).count()
            },
            "reviews": {
                "total": db.query(Review).count()
            }
        }
    except Exception as e:
        logger.error(f"Application metrics check failed: {e}")
        health_status["checks"]["application"] = {
            "status": "unknown",
            "error": str(e)
        }

    # Features status
    health_status["checks"]["features"] = {
        "status": "healthy",
        "rate_limiting": "enabled" if settings.ENABLE_RATE_LIMITING else "disabled",
        "cors_configured": bool(settings.cors_origins_list),
        "encryption": "enabled" if settings.CREDENTIAL_ENCRYPTION_KEY else "disabled"
    }

    return health_status


@router.get("/ready")
def readiness_check(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Readiness probe for Kubernetes/container orchestration

    Returns:
        Whether the application is ready to serve traffic
    """
    try:
        # Check database is accessible
        db.execute(text("SELECT 1"))

        # Check critical tables exist
        db.execute(text("SELECT COUNT(*) FROM users"))
        db.execute(text("SELECT COUNT(*) FROM games"))

        return {
            "ready": True,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "ready": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@router.get("/live")
def liveness_check() -> Dict[str, str]:
    """
    Liveness probe for Kubernetes/container orchestration

    Returns:
        Whether the application process is alive
    """
    return {
        "alive": True,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/metrics")
def get_metrics(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Prometheus-compatible metrics endpoint (requires admin auth)

    Returns:
        Application metrics in a structured format
    """
    # Only admins can access metrics
    if not current_user or current_user.user_type != "ADMIN":
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Admin access required"}
        )

    try:
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "counters": {},
            "gauges": {},
            "histograms": {}
        }

        # User metrics
        metrics["gauges"]["users_total"] = db.query(User).count()
        metrics["gauges"]["users_active"] = db.query(User).filter(
            User.is_active == True
        ).count()
        metrics["gauges"]["users_online"] = db.query(User).filter(
            User.is_online == True
        ).count()

        # User type breakdown
        for user_type in ["PLAYER", "CLIENT", "ADMIN"]:
            count = db.query(User).filter(User.user_type == user_type).count()
            metrics["gauges"][f"users_type_{user_type.lower()}"] = count

        # Message metrics
        metrics["counters"]["messages_total"] = db.query(Message).count()
        metrics["counters"]["messages_unread"] = db.query(Message).filter(
            Message.is_read == False
        ).count()

        # Promotion metrics
        metrics["gauges"]["promotions_active"] = db.query(Promotion).filter(
            Promotion.status == "ACTIVE"
        ).count()

        # Review metrics
        metrics["counters"]["reviews_total"] = db.query(Review).count()

        # System metrics
        if psutil:
            metrics["gauges"]["system_cpu_percent"] = psutil.cpu_percent()
            metrics["gauges"]["system_memory_percent"] = psutil.virtual_memory().percent
            metrics["gauges"]["system_disk_percent"] = psutil.disk_usage('/').percent

        return metrics

    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Failed to collect metrics"}
        )


@router.post("/test-error/{error_type}")
def test_error_handling(
    error_type: str,
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, str]:
    """
    Test error handling (admin only, for testing purposes)

    Args:
        error_type: Type of error to trigger (database, validation, custom, general)

    Returns:
        Should trigger the appropriate error handler
    """
    # Only admins can test error handling
    if current_user.user_type != "ADMIN":
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Admin access required"}
        )

    if error_type == "database":
        from sqlalchemy.exc import IntegrityError
        raise IntegrityError("Test database error", None, None)

    elif error_type == "validation":
        from app.exceptions import ValidationError
        raise ValidationError("Test validation error")

    elif error_type == "custom":
        from app.exceptions import BusinessLogicError
        raise BusinessLogicError("Test business logic error")

    elif error_type == "general":
        raise Exception("Test general exception")

    else:
        return {"message": f"Unknown error type: {error_type}"}