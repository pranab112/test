from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine
from app.models import Base  # Import from models package
from app.api.v1.router import api_router  # Import v1 router
from app.websocket import websocket_endpoint
from app.config import settings
from app.core import setup_logging, get_logger
import os

# Setup comprehensive logging
setup_logging(log_level=settings.LOG_LEVEL if hasattr(settings, 'LOG_LEVEL') else "INFO")
logger = get_logger(__name__)

# Run database migrations on startup
# NOTE: Migrations are handled by scripts/start.sh on Railway
# Commenting out to avoid duplicate migration runs which can cause hanging
# def run_migrations():
#     """Run Alembic migrations to ensure database schema is up to date"""
#     try:
#         from alembic.config import Config
#         from alembic import command
#         from pathlib import Path
#         from sqlalchemy import inspect
#
#         # First, ensure all tables exist using create_all
#         # This is safe because create_all only creates tables that don't exist
#         Base.metadata.create_all(bind=engine)
#         logger.info("Database tables verified/created")
#
#         # Get absolute path to alembic.ini relative to this file
#         base_dir = Path(__file__).resolve().parent.parent
#         alembic_ini_path = base_dir / "alembic.ini"
#
#         if alembic_ini_path.exists():
#             try:
#                 alembic_cfg = Config(str(alembic_ini_path))
#                 # Stamp the database with the latest revision if alembic_version doesn't exist
#                 # This prevents migration errors on existing databases
#                 inspector = inspect(engine)
#                 if not inspector.has_table('alembic_version'):
#                     logger.info("Stamping database with current alembic revision")
#                     command.stamp(alembic_cfg, "head")
#                 else:
#                     command.upgrade(alembic_cfg, "head")
#                 logger.info("Database migrations completed successfully")
#             except Exception as migration_error:
#                 logger.warning(f"Migration error (tables already exist): {migration_error}")
#         else:
#             logger.warning(f"alembic.ini not found at {alembic_ini_path}")
#     except Exception as e:
#         logger.error(f"Database setup error: {e}")
#         # Last resort fallback
#         try:
#             Base.metadata.create_all(bind=engine)
#         except Exception:
#             pass
#
# run_migrations()

app = FastAPI(
    title="Casino Royal SaaS API",
    version="1.0.0",
    description="Multi-tenant casino platform API",
    docs_url="/docs" if settings.is_development else None,  # Disable docs in production
    redoc_url="/redoc" if settings.is_development else None  # Disable redoc in production
)

# Log environment on startup
logger.info(f"Starting application in {settings.ENVIRONMENT} environment")
logger.info(f"CORS origins configured: {settings.cors_origins_list}")
logger.info(f"Rate limiting: {'ENABLED' if settings.ENABLE_RATE_LIMITING else 'DISABLED'}")

# Configure CORS with environment-aware settings
try:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=settings.allow_credentials,
        allow_methods=settings.allowed_methods,
        allow_headers=settings.allowed_headers,
    )
except ValueError as e:
    logger.error(f"CORS configuration error: {e}")
    if settings.is_production:
        raise  # Don't start in production with invalid CORS

# Custom middleware to handle null origin (DEVELOPMENT ONLY)
if settings.is_development:
    @app.middleware("http")
    async def dev_cors_handler(request: Request, call_next):
        """Development-only middleware to handle null origin from local files"""
        response = await call_next(request)
        origin = request.headers.get("origin")
        if origin == "null" or origin is None:
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
            logger.debug(f"Allowed null origin request to {request.url.path}")
        return response
else:
    # Production security headers
    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        """Add security headers in production"""
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

# Setup rate limiting (must be done before including routers)
from app.rate_limit import setup_rate_limiting
setup_rate_limiting(app)

# Setup exception handlers
from app.exceptions import setup_exception_handlers
setup_exception_handlers(app)

# Include API v1 router with /api/v1 prefix
app.include_router(api_router, prefix="/api/v1")

# Mount static files for uploads only
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# WebSocket endpoint
app.websocket("/ws")(websocket_endpoint)

# Root endpoint - API info
@app.get("/")
def read_root():
    """API root endpoint"""
    return {
        "service": "Casino Royal API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs" if settings.is_development else None
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/.well-known/{path:path}", include_in_schema=False)
def well_known_handler(path: str):
    """Handle .well-known requests (browser/extension metadata requests)"""
    from fastapi.responses import JSONResponse
    return JSONResponse({"error": "Not found"}, status_code=404)