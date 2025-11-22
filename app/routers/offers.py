from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from app import models, schemas, auth
from app.database import get_db
from app.models import UserType, OfferStatus, OfferClaimStatus, OfferType
from datetime import datetime

router = APIRouter(prefix="/offers", tags=["offers"])

def get_admin_user(current_user: models.User = Depends(auth.get_current_active_user)):
    """Ensure the current user is an admin"""
    if current_user.user_type != UserType.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def get_player_user(current_user: models.User = Depends(auth.get_current_active_user)):
    """Ensure the current user is a player"""
    if current_user.user_type != UserType.PLAYER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Player access required"
        )
    return current_user

def get_client_user(current_user: models.User = Depends(auth.get_current_active_user)):
    """Ensure the current user is a client"""
    if current_user.user_type != UserType.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Client access required"
        )
    return current_user

# ============= ADMIN ENDPOINTS =============

@router.post("/admin/create", response_model=schemas.PlatformOfferResponse)
def create_offer(
    offer: schemas.PlatformOfferCreate,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new platform offer (Admin only)"""
    new_offer = models.PlatformOffer(
        title=offer.title,
        description=offer.description,
        offer_type=offer.offer_type,
        bonus_amount=offer.bonus_amount,
        requirement_description=offer.requirement_description,
        max_claims=offer.max_claims,
        max_claims_per_player=offer.max_claims_per_player,
        end_date=offer.end_date,
        created_by=admin.id
    )

    db.add(new_offer)
    db.commit()
    db.refresh(new_offer)

    return new_offer

@router.get("/admin/all", response_model=List[schemas.PlatformOfferResponse])
def get_all_offers_admin(
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    include_inactive: bool = False
):
    """Get all platform offers with claim counts (Admin only)"""
    query = db.query(models.PlatformOffer)

    if not include_inactive:
        query = query.filter(models.PlatformOffer.status == OfferStatus.ACTIVE)

    offers = query.order_by(models.PlatformOffer.created_at.desc()).all()

    result = []
    for offer in offers:
        offer_dict = {
            "id": offer.id,
            "title": offer.title,
            "description": offer.description,
            "offer_type": offer.offer_type,
            "bonus_amount": offer.bonus_amount,
            "requirement_description": offer.requirement_description,
            "max_claims": offer.max_claims,
            "max_claims_per_player": offer.max_claims_per_player,
            "status": offer.status,
            "start_date": offer.start_date,
            "end_date": offer.end_date,
            "created_at": offer.created_at,
            "total_claims": len(offer.claims)
        }
        result.append(offer_dict)

    return result

@router.put("/admin/{offer_id}", response_model=schemas.PlatformOfferResponse)
def update_offer(
    offer_id: int,
    offer_update: schemas.PlatformOfferUpdate,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update a platform offer (Admin only)"""
    offer = db.query(models.PlatformOffer).filter(models.PlatformOffer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    update_data = offer_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(offer, key, value)

    db.commit()
    db.refresh(offer)

    return offer

@router.delete("/admin/{offer_id}")
def delete_offer(
    offer_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a platform offer (Admin only) - sets to inactive"""
    offer = db.query(models.PlatformOffer).filter(models.PlatformOffer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    offer.status = OfferStatus.INACTIVE
    db.commit()

    return {"message": "Offer deactivated successfully"}

@router.get("/admin/claims", response_model=List[schemas.OfferClaimResponse])
def get_all_claims_admin(
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    status_filter: Optional[OfferClaimStatus] = None
):
    """Get all offer claims (Admin only)"""
    query = db.query(models.OfferClaim)

    if status_filter:
        query = query.filter(models.OfferClaim.status == status_filter)

    claims = query.order_by(models.OfferClaim.claimed_at.desc()).all()

    result = []
    for claim in claims:
        result.append({
            "id": claim.id,
            "offer_id": claim.offer_id,
            "player_id": claim.player_id,
            "client_id": claim.client_id,
            "status": claim.status,
            "bonus_amount": claim.bonus_amount,
            "verification_data": claim.verification_data,
            "claimed_at": claim.claimed_at,
            "processed_at": claim.processed_at,
            "offer_title": claim.offer.title if claim.offer else None,
            "client_name": claim.client.company_name or claim.client.username if claim.client else None,
            "player_name": claim.player.username if claim.player else None
        })

    return result

# ============= PLAYER ENDPOINTS =============

@router.get("/available", response_model=List[schemas.PlatformOfferResponse])
def get_available_offers(
    player: models.User = Depends(get_player_user),
    db: Session = Depends(get_db)
):
    """Get all active offers available for the player to claim"""
    now = datetime.utcnow()

    # Get active offers that haven't expired
    offers = db.query(models.PlatformOffer).filter(
        models.PlatformOffer.status == OfferStatus.ACTIVE,
        (models.PlatformOffer.end_date == None) | (models.PlatformOffer.end_date > now)
    ).order_by(models.PlatformOffer.bonus_amount.desc()).all()

    result = []
    for offer in offers:
        # Count how many times this player has claimed this offer
        player_claims = db.query(models.OfferClaim).filter(
            models.OfferClaim.offer_id == offer.id,
            models.OfferClaim.player_id == player.id
        ).count()

        # Check if player can still claim
        can_claim = player_claims < offer.max_claims_per_player

        # Check if total claims limit reached
        if offer.max_claims:
            total_claims = len(offer.claims)
            if total_claims >= offer.max_claims:
                can_claim = False

        if can_claim:
            result.append({
                "id": offer.id,
                "title": offer.title,
                "description": offer.description,
                "offer_type": offer.offer_type,
                "bonus_amount": offer.bonus_amount,
                "requirement_description": offer.requirement_description,
                "max_claims": offer.max_claims,
                "max_claims_per_player": offer.max_claims_per_player,
                "status": offer.status,
                "start_date": offer.start_date,
                "end_date": offer.end_date,
                "created_at": offer.created_at,
                "total_claims": len(offer.claims)
            })

    return result

@router.get("/my-claims", response_model=List[schemas.OfferClaimResponse])
def get_my_claims(
    player: models.User = Depends(get_player_user),
    db: Session = Depends(get_db)
):
    """Get all claims made by the player"""
    claims = db.query(models.OfferClaim).filter(
        models.OfferClaim.player_id == player.id
    ).order_by(models.OfferClaim.claimed_at.desc()).all()

    result = []
    for claim in claims:
        result.append({
            "id": claim.id,
            "offer_id": claim.offer_id,
            "player_id": claim.player_id,
            "client_id": claim.client_id,
            "status": claim.status,
            "bonus_amount": claim.bonus_amount,
            "verification_data": claim.verification_data,
            "claimed_at": claim.claimed_at,
            "processed_at": claim.processed_at,
            "offer_title": claim.offer.title if claim.offer else None,
            "client_name": claim.client.company_name or claim.client.username if claim.client else None,
            "player_name": claim.player.username if claim.player else None
        })

    return result

@router.post("/claim", response_model=schemas.OfferClaimResponse)
def claim_offer(
    claim_data: schemas.OfferClaimCreate,
    player: models.User = Depends(get_player_user),
    db: Session = Depends(get_db)
):
    """Claim an offer with a specific client"""
    # Verify offer exists and is active
    offer = db.query(models.PlatformOffer).filter(
        models.PlatformOffer.id == claim_data.offer_id,
        models.PlatformOffer.status == OfferStatus.ACTIVE
    ).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found or not active")

    # Check expiry
    if offer.end_date and offer.end_date < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Offer has expired")

    # VALIDATION: For EMAIL_VERIFICATION offers, check if email is actually verified
    if offer.offer_type == OfferType.EMAIL_VERIFICATION:
        if not player.is_email_verified:
            raise HTTPException(
                status_code=400,
                detail="You must verify your email address before claiming this offer. Go to Settings > Email Verification to add and verify your email."
            )

    # Verify client exists
    client = db.query(models.User).filter(
        models.User.id == claim_data.client_id,
        models.User.user_type == UserType.CLIENT,
        models.User.is_active == True
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Check if player is connected to this client (friend relationship)
    is_friend = client in player.friends
    if not is_friend:
        raise HTTPException(
            status_code=400,
            detail="You must be connected with this client to claim offers with them"
        )

    # Check if already claimed with this client
    existing_claim = db.query(models.OfferClaim).filter(
        models.OfferClaim.offer_id == claim_data.offer_id,
        models.OfferClaim.player_id == player.id,
        models.OfferClaim.client_id == claim_data.client_id
    ).first()

    if existing_claim:
        raise HTTPException(status_code=400, detail="You have already claimed this offer with this client")

    # Check max claims per player
    player_total_claims = db.query(models.OfferClaim).filter(
        models.OfferClaim.offer_id == claim_data.offer_id,
        models.OfferClaim.player_id == player.id
    ).count()

    if player_total_claims >= offer.max_claims_per_player:
        raise HTTPException(status_code=400, detail="You have reached the maximum claims for this offer")

    # Check total claims limit
    if offer.max_claims:
        total_claims = len(offer.claims)
        if total_claims >= offer.max_claims:
            raise HTTPException(status_code=400, detail="This offer has reached its maximum claims")

    # Create claim
    new_claim = models.OfferClaim(
        offer_id=claim_data.offer_id,
        player_id=player.id,
        client_id=claim_data.client_id,
        bonus_amount=offer.bonus_amount,
        verification_data=claim_data.verification_data,
        status=OfferClaimStatus.PENDING
    )

    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)

    return {
        "id": new_claim.id,
        "offer_id": new_claim.offer_id,
        "player_id": new_claim.player_id,
        "client_id": new_claim.client_id,
        "status": new_claim.status,
        "bonus_amount": new_claim.bonus_amount,
        "verification_data": new_claim.verification_data,
        "claimed_at": new_claim.claimed_at,
        "processed_at": new_claim.processed_at,
        "offer_title": offer.title,
        "client_name": client.company_name or client.username,
        "player_name": player.username
    }

# ============= CLIENT ENDPOINTS =============

@router.get("/client/pending-claims", response_model=List[schemas.OfferClaimResponse])
def get_pending_claims_for_client(
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """Get all pending claims for this client to process"""
    claims = db.query(models.OfferClaim).filter(
        models.OfferClaim.client_id == client.id,
        models.OfferClaim.status == OfferClaimStatus.PENDING
    ).order_by(models.OfferClaim.claimed_at.desc()).all()

    result = []
    for claim in claims:
        result.append({
            "id": claim.id,
            "offer_id": claim.offer_id,
            "player_id": claim.player_id,
            "client_id": claim.client_id,
            "status": claim.status,
            "bonus_amount": claim.bonus_amount,
            "verification_data": claim.verification_data,
            "claimed_at": claim.claimed_at,
            "processed_at": claim.processed_at,
            "offer_title": claim.offer.title if claim.offer else None,
            "client_name": claim.client.company_name or claim.client.username if claim.client else None,
            "player_name": claim.player.username if claim.player else None
        })

    return result

@router.put("/client/process-claim/{claim_id}")
def process_claim(
    claim_id: int,
    process_data: schemas.OfferClaimProcess,
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """Process (approve/reject) an offer claim"""
    claim = db.query(models.OfferClaim).filter(
        models.OfferClaim.id == claim_id,
        models.OfferClaim.client_id == client.id
    ).first()

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    if claim.status != OfferClaimStatus.PENDING:
        raise HTTPException(status_code=400, detail="Claim has already been processed")

    claim.status = process_data.status
    claim.processed_at = datetime.utcnow()
    claim.processed_by = client.id

    # If approved/completed, add bonus to player credits
    if process_data.status in [OfferClaimStatus.APPROVED, OfferClaimStatus.COMPLETED]:
        player = db.query(models.User).filter(models.User.id == claim.player_id).first()
        if player:
            player.credits = (player.credits or 0) + claim.bonus_amount

    db.commit()

    return {"message": f"Claim {process_data.status.value} successfully"}

@router.get("/client/all-claims", response_model=List[schemas.OfferClaimResponse])
def get_all_claims_for_client(
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """Get all claims for this client (all statuses)"""
    claims = db.query(models.OfferClaim).filter(
        models.OfferClaim.client_id == client.id
    ).order_by(models.OfferClaim.claimed_at.desc()).all()

    result = []
    for claim in claims:
        result.append({
            "id": claim.id,
            "offer_id": claim.offer_id,
            "player_id": claim.player_id,
            "client_id": claim.client_id,
            "status": claim.status,
            "bonus_amount": claim.bonus_amount,
            "verification_data": claim.verification_data,
            "claimed_at": claim.claimed_at,
            "processed_at": claim.processed_at,
            "offer_title": claim.offer.title if claim.offer else None,
            "client_name": claim.client.company_name or claim.client.username if claim.client else None,
            "player_name": claim.player.username if claim.player else None
        })

    return result
