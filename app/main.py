from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routers import auth, friends, users, chat
from app.websocket import websocket_endpoint
from app.config import settings
import os

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Casino Royal SaaS", version="1.0.0")

# Configure CORS - Use environment variable for allowed origins
# SECURITY WARNING: "*" allows all origins - Configure CORS_ORIGINS in .env for production
# Example in .env: CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware to handle null origin specifically
@app.middleware("http")
async def cors_handler(request, call_next):
    response = await call_next(request)
    origin = request.headers.get("origin")
    if origin == "null" or origin is None:
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

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
from app.routers import email_verification
app.include_router(email_verification.router)
from app.routers import game_credentials
app.include_router(game_credentials.router)
from app.routers import reports
app.include_router(reports.router)
from app.routers import admin
app.include_router(admin.router)
from app.routers import client
app.include_router(client.router)

# Mount static files for uploads
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Mount static files for dashboard HTML files
app.mount("/static", StaticFiles(directory="."), name="static")

# WebSocket endpoint
app.websocket("/ws")(websocket_endpoint)

from fastapi.responses import FileResponse

@app.get("/")
def read_root():
    return FileResponse("login.html")

@app.get("/login")
def serve_login():
    return FileResponse("login.html")

@app.get("/client")
def serve_client_dashboard():
    return FileResponse("client-dashboard.html")

@app.get("/player")
def serve_player_dashboard():
    return FileResponse("player-dashboard.html")

@app.get("/register")
def serve_player_registration():
    return FileResponse("player-register.html")

@app.get("/admin")
def serve_admin_dashboard():
    return FileResponse("admin-dashboard.html")

@app.get("/health")
def health_check():
    return {"status": "healthy"}