from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from app import models, schemas, auth
from app.database import get_db
from app.models import UserType, OfferStatus, OfferClaimStatus, OfferType, MessageType
from datetime import datetime, timezone
from decimal import Decimal, ROUND_DOWN

router = APIRouter(prefix="/offers", tags=["offers"])

# Credit conversion rate: 100 credits = $1
CREDITS_PER_DOLLAR = 100

def credits_to_dollars(credits: int) -> float:
    """Convert credits to dollars (100 credits = $1)"""
    return round(credits / CREDITS_PER_DOLLAR, 2)

def dollars_to_credits(dollars: float) -> int:
    """Convert dollars to credits (100 credits = $1)"""
    return int(dollars * CREDITS_PER_DOLLAR)

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
    """
    Create a new platform offer (Admin only).
    Offers give bonus credits to both players and clients when approved.
    """
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

@router.get("/admin/pending-claims", response_model=List[schemas.OfferClaimResponse])
def get_pending_claims_admin(
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all pending offer claims for admin to approve (Admin only)"""
    claims = db.query(models.OfferClaim).filter(
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

@router.put("/admin/process-claim/{claim_id}")
def admin_process_claim(
    claim_id: int,
    process_data: schemas.OfferClaimProcess,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Process (approve/reject) an offer claim (Admin only).
    When approved, bonus credits are added to BOTH the player AND the client.
    """
    claim = db.query(models.OfferClaim).filter(
        models.OfferClaim.id == claim_id
    ).first()

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    if claim.status != OfferClaimStatus.PENDING:
        raise HTTPException(status_code=400, detail="Claim has already been processed")

    claim.status = process_data.status
    claim.processed_at = datetime.now(timezone.utc)
    claim.processed_by = admin.id

    # If approved, add bonus credits to BOTH player AND client
    if process_data.status in [OfferClaimStatus.APPROVED, OfferClaimStatus.COMPLETED]:
        player = db.query(models.User).filter(models.User.id == claim.player_id).first()
        client = db.query(models.User).filter(models.User.id == claim.client_id).first() if claim.client_id else None

        bonus_credits = claim.bonus_amount
        dollar_value = credits_to_dollars(bonus_credits)

        # Add credits to player
        if player:
            player.credits = (player.credits or 0) + bonus_credits

            # Send message to player about approved bonus
            player_message = models.Message(
                sender_id=admin.id,
                receiver_id=player.id,
                message_type=MessageType.TEXT,
                content=f"🎉 Bonus Approved!\n\nYour claim for \"{claim.offer.title}\" has been approved.\n\n💰 You received: {bonus_credits} credits (${dollar_value:.2f})\n\nYour new balance: {player.credits} credits"
            )
            db.add(player_message)

        # Add credits to client (if associated)
        if client:
            client.credits = (client.credits or 0) + bonus_credits

            # Send message to client about bonus
            client_message = models.Message(
                sender_id=admin.id,
                receiver_id=client.id,
                message_type=MessageType.TEXT,
                content=f"🎉 Bonus Credited!\n\nPlayer {player.username if player else 'Unknown'} claimed \"{claim.offer.title}\" with you.\n\n💰 You received: {bonus_credits} credits (${dollar_value:.2f})\n\nYour new balance: {client.credits} credits"
            )
            db.add(client_message)

    elif process_data.status == OfferClaimStatus.REJECTED:
        # Notify player about rejection
        player = db.query(models.User).filter(models.User.id == claim.player_id).first()
        if player:
            reject_message = models.Message(
                sender_id=admin.id,
                receiver_id=player.id,
                message_type=MessageType.TEXT,
                content=f"❌ Claim Rejected\n\nYour claim for \"{claim.offer.title}\" has been rejected.\n\nPlease contact support if you believe this is an error."
            )
            db.add(reject_message)

    db.commit()

    return {"message": f"Claim {process_data.status.value} successfully"}

# ============= PLAYER ENDPOINTS =============

@router.get("/available", response_model=List[schemas.PlatformOfferResponse])
def get_available_offers(
    player: models.User = Depends(get_player_user),
    db: Session = Depends(get_db)
):
    """Get all active offers available for the player to claim"""
    now = datetime.now(timezone.utc)

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
    """
    Claim an offer. The claim goes to admin for approval.
    Once approved, both player and associated client receive bonus credits.
    """
    # Use row-level locking to prevent race conditions
    offer = db.query(models.PlatformOffer).filter(
        models.PlatformOffer.id == claim_data.offer_id,
        models.PlatformOffer.status == OfferStatus.ACTIVE
    ).with_for_update().first()

    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found or not active")

    # Check expiry
    if offer.end_date and offer.end_date < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Offer has expired")

    # VALIDATION: For EMAIL_VERIFICATION offers, check if email is actually verified
    if offer.offer_type == OfferType.EMAIL_VERIFICATION:
        if not player.is_email_verified:
            raise HTTPException(
                status_code=400,
                detail="You must verify your email address before claiming this offer."
            )

    # Verify client exists (optional - player can claim without client)
    client = None
    if claim_data.client_id:
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

    # Check if already claimed (with lock to prevent duplicates)
    existing_claim = db.query(models.OfferClaim).filter(
        models.OfferClaim.offer_id == claim_data.offer_id,
        models.OfferClaim.player_id == player.id
    ).with_for_update().first()

    if existing_claim:
        raise HTTPException(status_code=400, detail="You have already claimed this offer")

    # Check max claims per player
    player_total_claims = db.query(func.count(models.OfferClaim.id)).filter(
        models.OfferClaim.offer_id == claim_data.offer_id,
        models.OfferClaim.player_id == player.id
    ).scalar() or 0

    if player_total_claims >= offer.max_claims_per_player:
        raise HTTPException(status_code=400, detail="You have reached the maximum claims for this offer")

    # Check total claims limit
    if offer.max_claims:
        total_claims = db.query(func.count(models.OfferClaim.id)).filter(
            models.OfferClaim.offer_id == claim_data.offer_id
        ).scalar() or 0
        if total_claims >= offer.max_claims:
            raise HTTPException(status_code=400, detail="This offer has reached its maximum claims")

    # Create claim (goes to admin for approval)
    new_claim = models.OfferClaim(
        offer_id=claim_data.offer_id,
        player_id=player.id,
        client_id=claim_data.client_id if claim_data.client_id else None,
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
        "client_name": client.company_name or client.username if client else None,
        "player_name": player.username
    }

# ============= CREDIT TRANSFER (Player to Client only) =============

@router.post("/transfer-credits")
def transfer_credits_to_client(
    transfer_data: schemas.CreditTransfer,
    player: models.User = Depends(get_player_user),
    db: Session = Depends(get_db)
):
    """
    Transfer credits from player to client (one-way transaction).
    This is used for game transactions where players pay clients to play.
    Rate: 100 credits = $1
    """
    # Validate transfer amount
    if transfer_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Transfer amount must be positive")

    # Check player has enough credits
    if (player.credits or 0) < transfer_data.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient credits. You have {player.credits or 0} credits, trying to send {transfer_data.amount}"
        )

    # Get the client
    client = db.query(models.User).filter(
        models.User.id == transfer_data.client_id,
        models.User.user_type == UserType.CLIENT,
        models.User.is_active == True
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Check if player is friends with client
    if client not in player.friends:
        raise HTTPException(
            status_code=400,
            detail="You can only transfer credits to clients you are connected with"
        )

    # Calculate dollar value
    credits_amount = transfer_data.amount
    dollar_value = credits_to_dollars(credits_amount)

    # Perform the transfer
    player.credits = (player.credits or 0) - credits_amount
    client.credits = (client.credits or 0) + credits_amount

    # Create transaction message for player (sender)
    player_message = models.Message(
        sender_id=player.id,
        receiver_id=client.id,
        message_type=MessageType.TEXT,
        content=f"💸 Credit Transfer Sent\n\n"
                f"You sent {credits_amount} credits (${dollar_value:.2f}) to {client.company_name or client.username}.\n\n"
                f"Your remaining balance: {player.credits} credits (${credits_to_dollars(player.credits):.2f})"
    )
    db.add(player_message)

    # Create transaction message for client (receiver)
    client_message = models.Message(
        sender_id=player.id,
        receiver_id=client.id,
        message_type=MessageType.TEXT,
        content=f"💰 Credit Transfer Received\n\n"
                f"You received {credits_amount} credits (${dollar_value:.2f}) from {player.full_name or player.username}.\n\n"
                f"Your new balance: {client.credits} credits (${credits_to_dollars(client.credits):.2f})"
    )
    db.add(client_message)

    db.commit()

    return {
        "message": "Transfer successful",
        "credits_transferred": credits_amount,
        "dollar_value": dollar_value,
        "player_new_balance": player.credits,
        "client_new_balance": client.credits,
        "from_player": player.username,
        "to_client": client.company_name or client.username
    }

@router.get("/my-balance")
def get_my_balance(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's credit balance with dollar equivalent"""
    credits = current_user.credits or 0
    dollar_value = credits_to_dollars(credits)

    return {
        "credits": credits,
        "dollar_value": dollar_value,
        "rate": "100 credits = $1"
    }

# ============= CLIENT ENDPOINTS (View only - no approval) =============

@router.get("/client/received-transfers")
def get_received_transfers(
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """Get all credit transfers received by this client"""
    # Get messages that contain credit transfer notifications
    messages = db.query(models.Message).filter(
        models.Message.receiver_id == client.id,
        models.Message.content.like("%Credit Transfer Received%")
    ).order_by(models.Message.created_at.desc()).all()

    return {
        "total_balance": client.credits or 0,
        "dollar_value": credits_to_dollars(client.credits or 0),
        "transfer_count": len(messages)
    }
