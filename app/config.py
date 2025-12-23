from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional, List
import os
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Environment configuration
    ENVIRONMENT: str = "development"  # development, staging, production

    # CORS Configuration - comma-separated list of allowed origins
    # Example: "http://localhost:3000,https://yourdomain.com"
    # Use "*" only for development (SECURITY RISK in production)
    CORS_ORIGINS: Optional[str] = None

    # Feature flags
    ENABLE_RATE_LIMITING: bool = False

    # Logging configuration
    LOG_LEVEL: str = "INFO"

    # Encryption key for credentials
    CREDENTIAL_ENCRYPTION_KEY: Optional[str] = None

    # Allow unknown/extra environment variables (e.g., placeholders in .env) to be ignored
    model_config = ConfigDict(extra="ignore", env_file=".env", case_sensitive=False)

    @property
    def cors_origins_list(self) -> List[str]:
        """Convert comma-separated CORS origins to list with environment-based defaults"""
        # If explicitly set, use that
        if self.CORS_ORIGINS:
            if self.CORS_ORIGINS == "*":
                if self.ENVIRONMENT == "production":
                    logger.warning("CORS set to '*' in production! This is a security risk!")
                return ["*"]
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

        # Environment-based defaults
        if self.ENVIRONMENT == "development":
            # Permissive for development
            return ["http://localhost:3000", "http://localhost:8000", "http://localhost:5173", "http://127.0.0.1:3000"]
        elif self.ENVIRONMENT == "staging":
            # Must be explicitly set for staging
            logger.warning("No CORS_ORIGINS set for staging environment")
            return []
        else:  # production
            # Must be explicitly set for production
            raise ValueError("CORS_ORIGINS must be explicitly set in production environment!")

    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.ENVIRONMENT == "development"

    @property
    def allow_credentials(self) -> bool:
        """Whether to allow credentials in CORS"""
        # Always true for authenticated APIs
        return True

    @property
    def allowed_methods(self) -> List[str]:
        """Allowed HTTP methods for CORS"""
        return ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]

    @property
    def allowed_headers(self) -> List[str]:
        """Allowed headers for CORS"""
        return ["*"]  # Can be restricted further if needed

settings = Settings()