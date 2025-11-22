from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routers import auth, friends, users, chat
from app.websocket import websocket_endpoint
from app.config import settings
import os
import logging

# Setup logging based on environment
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Run database migrations on startup
def run_migrations():
    """Run Alembic migrations to ensure database schema is up to date"""
    try:
        from alembic.config import Config
        from alembic import command
        from pathlib import Path
        from sqlalchemy import inspect

        # First, ensure all tables exist using create_all
        # This is safe because create_all only creates tables that don't exist
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified/created")

        # Get absolute path to alembic.ini relative to this file
        base_dir = Path(__file__).resolve().parent.parent
        alembic_ini_path = base_dir / "alembic.ini"

        if alembic_ini_path.exists():
            try:
                alembic_cfg = Config(str(alembic_ini_path))
                # Stamp the database with the latest revision if alembic_version doesn't exist
                # This prevents migration errors on existing databases
                inspector = inspect(engine)
                if not inspector.has_table('alembic_version'):
                    logger.info("Stamping database with current alembic revision")
                    command.stamp(alembic_cfg, "head")
                else:
                    command.upgrade(alembic_cfg, "head")
                logger.info("Database migrations completed successfully")
            except Exception as migration_error:
                logger.warning(f"Migration error (tables already exist): {migration_error}")
        else:
            logger.warning(f"alembic.ini not found at {alembic_ini_path}")
    except Exception as e:
        logger.error(f"Database setup error: {e}")
        # Last resort fallback
        try:
            Base.metadata.create_all(bind=engine)
        except Exception:
            pass

run_migrations()

app = FastAPI(
    title="Casino Royal SaaS",
    version="1.0.0",
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

# Include routers
app.include_router(auth.router)
app.include_router(friends.router)
app.include_router(users.router)
app.include_router(chat.router)
from app.routers import reviews
app.include_router(reviews.router)
from app.routers import profiles
app.include_router(profiles.router)
from app.routers import promotions
app.include_router(promotions.router)
from app.routers import payment_methods
app.include_router(payment_methods.router)
from app.routers import games
app.include_router(games.router)
from app.routers import online_status
app.include_router(online_status.router)
from app.routers import email_verification_otp
app.include_router(email_verification_otp.router)
from app.routers import game_credentials
app.include_router(game_credentials.router)
from app.routers import reports
app.include_router(reports.router)
from app.routers import admin
app.include_router(admin.router)
from app.routers import client
app.include_router(client.router)
from app.routers import monitoring
app.include_router(monitoring.router)
from app.routers import offers
app.include_router(offers.router)

# Mount static files for uploads
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Mount static files for dashboard HTML files
app.mount("/static", StaticFiles(directory="."), name="static")

# WebSocket endpoint
app.websocket("/ws")(websocket_endpoint)

from fastapi.responses import FileResponse, RedirectResponse

@app.get("/")
def read_root():
    return RedirectResponse(url="/client")

@app.get("/client")
def serve_client_dashboard():
    return FileResponse("client-dashboard.html")

@app.get("/player")
def serve_player_dashboard():
    return FileResponse("player-dashboard.html")

@app.get("/admin")
def serve_admin_dashboard():
    return FileResponse("admin-dashboard.html")

@app.get("/health")
def health_check():
    return {"status": "healthy"}