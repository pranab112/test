"""
Main router aggregator for API v1
Combines all v1 endpoints under /api/v1 prefix
"""
from fastapi import APIRouter
from app.api.v1 import (
    auth,
    users,
    friends,
    chat,
    reviews,
    profiles,
    promotions,
    payment_methods,
    games,
    game_credentials,
    online_status,
    email_verification_otp,
    reports,
    admin,
    client,
    monitoring,
    offers,
    two_factor,
    contact,
    tickets,
    referrals,
    community,
    settings
)

# Create main API v1 router
api_router = APIRouter()

# Include all sub-routers
api_router.include_router(auth.router, tags=["authentication"])
api_router.include_router(users.router, tags=["users"])
api_router.include_router(friends.router, tags=["friends"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(reviews.router, tags=["reviews"])
api_router.include_router(profiles.router, tags=["profiles"])
api_router.include_router(promotions.router, tags=["promotions"])
api_router.include_router(payment_methods.router, tags=["payments"])
api_router.include_router(games.router, tags=["games"])
api_router.include_router(game_credentials.router, tags=["game-credentials"])
api_router.include_router(online_status.router, tags=["online-status"])
api_router.include_router(email_verification_otp.router, tags=["email-verification"])
api_router.include_router(reports.router, tags=["reports"])
api_router.include_router(admin.router, tags=["admin"])
api_router.include_router(client.router, tags=["client"])
api_router.include_router(monitoring.router, tags=["monitoring"])
api_router.include_router(offers.router, tags=["offers"])
api_router.include_router(two_factor.router, tags=["two-factor-auth"])
api_router.include_router(contact.router, tags=["contact"])
api_router.include_router(tickets.router, tags=["support-tickets"])
api_router.include_router(referrals.router, tags=["referrals"])
api_router.include_router(community.router, tags=["community"])
api_router.include_router(settings.router, tags=["settings"])
