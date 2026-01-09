from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import json
from app import models, schemas, auth
from app.database import get_db
from app.models import UserType, PromotionStatus, PromotionType, ClaimStatus, MessageType
from app.websocket import manager, WSMessage, WSMessageType

router = APIRouter(prefix="/promotions", tags=["promotions"])


# Client endpoints - Create and manage promotions
@router.post("/create", response_model=schemas.PromotionResponse)
async def create_promotion(
    promotion: schemas.PromotionCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new promotion (Client only)"""
    if current_user.user_type != UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can create promotions")

    # Cap total_budget to client's current credits if not specified or if it exceeds
    total_budget = promotion.total_budget
    if total_budget is None:
        # If unlimited, cap to client's current credits
        total_budget = current_user.credits
    elif total_budget > current_user.credits:
        # If specified budget exceeds client credits, cap it
        total_budget = current_user.credits

    # Validate that budget can cover at least one claim
    if total_budget < promotion.value:
        raise HTTPException(
            status_code=400,
            detail=f"Total budget ({total_budget}) must be at least equal to the promotion value ({promotion.value})"
        )

    # Create the promotion
    db_promotion = models.Promotion(
        client_id=current_user.id,
        title=promotion.title,
        description=promotion.description,
        promotion_type=promotion.promotion_type,
        value=promotion.value,
        max_claims_per_player=promotion.max_claims_per_player,
        total_budget=total_budget,
        min_player_level=promotion.min_player_level,
        requires_screenshot=promotion.requires_screenshot,
        end_date=promotion.end_date,
        target_player_ids=json.dumps(promotion.target_player_ids) if promotion.target_player_ids else None,
        terms=promotion.terms,
        wagering_requirement=promotion.wagering_requirement
    )

    db.add(db_promotion)
    db.commit()
    db.refresh(db_promotion)

    # Send notifications to eligible players (via WebSocket later)
    # For now, just return the created promotion

    return _format_promotion_response(db_promotion, current_user, db)


@router.get("/my-promotions", response_model=List[schemas.PromotionResponse])
async def get_my_promotions(
    status: Optional[PromotionStatus] = None,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all promotions created by current client"""
    if current_user.user_type != UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can view their promotions")

    query = db.query(models.Promotion).filter(models.Promotion.client_id == current_user.id)

    if status:
        query = query.filter(models.Promotion.status == status)

    promotions = query.order_by(models.Promotion.created_at.desc()).all()

    return [_format_promotion_response(p, current_user, db) for p in promotions]


@router.get("/stats/{promotion_id}", response_model=schemas.PromotionStatsResponse)
async def get_promotion_stats(
    promotion_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get statistics for a specific promotion (Client only)"""
    if current_user.user_type != UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can view promotion stats")

    promotion = db.query(models.Promotion).filter(
        models.Promotion.id == promotion_id,
        models.Promotion.client_id == current_user.id
    ).first()

    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")

    # Calculate statistics
    claims = db.query(models.PromotionClaim).filter(
        models.PromotionClaim.promotion_id == promotion_id
    ).all()

    total_claims = len(claims)
    unique_players = len(set(c.player_id for c in claims))
    total_value_claimed = sum(c.claimed_value for c in claims)

    # Calculate eligible players count for claim rate
    if promotion.target_player_ids:
        target_ids = json.loads(promotion.target_player_ids)
        eligible_count = len(target_ids)
    else:
        # Count all players connected to this client
        eligible_count = db.query(models.User).join(
            models.friends_association,
            or_(
                and_(models.friends_association.c.user_id == current_user.id,
                     models.friends_association.c.friend_id == models.User.id),
                and_(models.friends_association.c.friend_id == current_user.id,
                     models.friends_association.c.user_id == models.User.id)
            )
        ).filter(models.User.user_type == UserType.PLAYER).count()

    claim_rate = (unique_players / eligible_count * 100) if eligible_count > 0 else 0
    avg_claim_value = (total_value_claimed / total_claims) if total_claims > 0 else 0

    return schemas.PromotionStatsResponse(
        promotion_id=promotion.id,
        title=promotion.title,
        total_claims=total_claims,
        unique_players=unique_players,
        total_value_claimed=total_value_claimed,
        remaining_budget=promotion.total_budget - promotion.used_budget if promotion.total_budget else None,
        claim_rate=claim_rate,
        avg_claim_value=avg_claim_value,
        status=promotion.status
    )


# Player endpoints - View and claim promotions
@router.get("/available", response_model=List[schemas.PromotionResponse])
async def get_available_promotions(
    client_id: Optional[int] = None,
    promotion_type: Optional[PromotionType] = None,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all available promotions for current player"""
    if current_user.user_type != UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players can view available promotions")

    # Get all clients connected to this player
    connected_clients = db.query(models.User).join(
        models.friends_association,
        or_(
            and_(models.friends_association.c.user_id == current_user.id,
                 models.friends_association.c.friend_id == models.User.id),
            and_(models.friends_association.c.friend_id == current_user.id,
                 models.friends_association.c.user_id == models.User.id)
        )
    ).filter(models.User.user_type == UserType.CLIENT)

    if client_id:
        connected_clients = connected_clients.filter(models.User.id == client_id)

    client_ids = [c.id for c in connected_clients.all()]

    if not client_ids:
        return []

    # Get active promotions from connected clients
    # Use UTC now for comparison (database stores timezone-aware datetimes)
    now_utc = datetime.now(timezone.utc)
    query = db.query(models.Promotion).filter(
        models.Promotion.client_id.in_(client_ids),
        models.Promotion.status == PromotionStatus.ACTIVE,
        models.Promotion.end_date > now_utc
    )

    if promotion_type:
        query = query.filter(models.Promotion.promotion_type == promotion_type)

    # Filter by player level
    query = query.filter(models.Promotion.min_player_level <= current_user.player_level)

    promotions = query.order_by(models.Promotion.created_at.desc()).all()

    # Filter by target players if specified
    eligible_promotions = []
    for promo in promotions:
        if promo.target_player_ids:
            target_ids = json.loads(promo.target_player_ids)
            if current_user.id not in target_ids:
                continue
        eligible_promotions.append(promo)

    return [_format_promotion_response(p, current_user, db) for p in eligible_promotions]


@router.post("/claim", response_model=schemas.PromotionClaimResponse)
async def claim_promotion(
    claim_request: schemas.PromotionClaimRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Claim a promotion (Player only)

    This creates a PENDING_APPROVAL claim and sends an approval request message to the client.
    The client must approve the claim before any credits are added.
    """
    if current_user.user_type != UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players can claim promotions")

    # Get the promotion
    promotion = db.query(models.Promotion).filter(
        models.Promotion.id == claim_request.promotion_id,
        models.Promotion.status == PromotionStatus.ACTIVE
    ).first()

    if not promotion:
        return schemas.PromotionClaimResponse(
            success=False,
            message="Promotion not found or inactive"
        )

    # Check if promotion has expired (database stores timezone-aware datetimes)
    if promotion.end_date < datetime.now(timezone.utc):
        promotion.status = PromotionStatus.EXPIRED
        db.commit()
        return schemas.PromotionClaimResponse(
            success=False,
            message="Promotion has expired"
        )

    # Check if player is connected to the client
    is_connected = db.query(models.friends_association).filter(
        or_(
            and_(models.friends_association.c.user_id == current_user.id,
                 models.friends_association.c.friend_id == promotion.client_id),
            and_(models.friends_association.c.friend_id == current_user.id,
                 models.friends_association.c.user_id == promotion.client_id)
        )
    ).first()

    if not is_connected:
        return schemas.PromotionClaimResponse(
            success=False,
            message="You must be connected to this client to claim their promotions"
        )

    # Check player level
    if current_user.player_level < promotion.min_player_level:
        return schemas.PromotionClaimResponse(
            success=False,
            message=f"Minimum level {promotion.min_player_level} required"
        )

    # Check if already has a pending or approved claim
    existing_claim = db.query(models.PromotionClaim).filter(
        models.PromotionClaim.promotion_id == claim_request.promotion_id,
        models.PromotionClaim.player_id == current_user.id
    ).first()

    if existing_claim:
        if existing_claim.status == ClaimStatus.PENDING_APPROVAL:
            return schemas.PromotionClaimResponse(
                success=False,
                message="You already have a pending claim for this promotion. Please wait for approval."
            )
        elif existing_claim.status in [ClaimStatus.APPROVED, ClaimStatus.CLAIMED]:
            return schemas.PromotionClaimResponse(
                success=False,
                message="You have already claimed this promotion"
            )
        elif existing_claim.status == ClaimStatus.REJECTED:
            # Allow re-claiming if previously rejected
            db.delete(existing_claim)
            db.flush()

    # Check if promotion requires screenshot and validate
    if promotion.requires_screenshot and not claim_request.screenshot_url:
        return schemas.PromotionClaimResponse(
            success=False,
            message="This promotion requires a screenshot proof. Please provide a screenshot URL.",
            requires_screenshot=True
        )

    # Check budget if applicable (reserve the budget)
    if promotion.total_budget:
        if promotion.used_budget >= promotion.total_budget:
            promotion.status = PromotionStatus.DEPLETED
            db.commit()
            return schemas.PromotionClaimResponse(
                success=False,
                message="Promotion budget depleted"
            )

        # Check if remaining budget is enough
        if promotion.used_budget + promotion.value > promotion.total_budget:
            return schemas.PromotionClaimResponse(
                success=False,
                message="Insufficient promotion budget remaining"
            )

    # Create the claim with PENDING_APPROVAL status
    wagering_required = promotion.value * promotion.wagering_requirement

    claim = models.PromotionClaim(
        promotion_id=promotion.id,
        player_id=current_user.id,
        client_id=promotion.client_id,
        claimed_value=promotion.value,
        status=ClaimStatus.PENDING_APPROVAL,
        screenshot_url=claim_request.screenshot_url,
        wagering_required=wagering_required
    )

    db.add(claim)
    db.flush()  # Get the claim ID

    # Create approval request message to the client
    now = datetime.now(timezone.utc)
    approval_message_content = json.dumps({
        "type": "promotion_claim_request",
        "claim_id": claim.id,
        "promotion_id": promotion.id,
        "promotion_title": promotion.title,
        "promotion_type": promotion.promotion_type.value,
        "value": promotion.value,
        "player_id": current_user.id,
        "player_username": current_user.username,
        "player_level": current_user.player_level,
        "requires_screenshot": promotion.requires_screenshot,
        "screenshot_url": claim_request.screenshot_url
    })

    approval_message = models.Message(
        sender_id=current_user.id,
        receiver_id=promotion.client_id,
        message_type=MessageType.PROMOTION,
        content=approval_message_content,
        is_read=False,
        created_at=now
    )

    db.add(approval_message)
    db.flush()

    # Link message to claim
    claim.approval_message_id = approval_message.id

    db.commit()

    # Send WebSocket notification to the client
    client = db.query(models.User).filter(models.User.id == promotion.client_id).first()

    await manager.send_to_user(promotion.client_id, WSMessage(
        type=WSMessageType.MESSAGE_NEW,
        data={
            "id": approval_message.id,
            "sender_id": current_user.id,
            "sender_name": current_user.username,
            "sender_avatar": current_user.profile_picture,
            "sender_type": current_user.user_type.value,
            "receiver_id": promotion.client_id,
            "message_type": "promotion",
            "content": approval_message_content,
            "is_read": False,
            "created_at": approval_message.created_at.isoformat(),
            "room_id": f"dm-{min(current_user.id, promotion.client_id)}-{max(current_user.id, promotion.client_id)}",
            "promotion_claim": {
                "claim_id": claim.id,
                "promotion_title": promotion.title,
                "promotion_type": promotion.promotion_type.value,
                "value": promotion.value,
                "player_username": current_user.username,
                "status": "pending_approval",
                "requires_screenshot": promotion.requires_screenshot,
                "screenshot_url": claim_request.screenshot_url
            }
        }
    ))

    return schemas.PromotionClaimResponse(
        success=True,
        message="Claim request sent! Waiting for client approval.",
        claim_id=claim.id,
        claimed_value=promotion.value,
        wagering_required=wagering_required if promotion.wagering_requirement > 1 else None,
        status="pending_approval",
        screenshot_url=claim_request.screenshot_url,
        requires_screenshot=promotion.requires_screenshot
    )


@router.get("/my-claims", response_model=List[dict])
async def get_my_claims(
    status: Optional[ClaimStatus] = None,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all promotions claimed by current player"""
    if current_user.user_type != UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players can view their claims")

    query = db.query(models.PromotionClaim).filter(
        models.PromotionClaim.player_id == current_user.id
    )

    if status:
        query = query.filter(models.PromotionClaim.status == status)

    claims = query.order_by(models.PromotionClaim.claimed_at.desc()).all()

    result = []
    for claim in claims:
        promotion = claim.promotion
        client = claim.client

        result.append({
            "claim_id": claim.id,
            "promotion_title": promotion.title,
            "promotion_type": promotion.promotion_type,
            "client_name": client.full_name or client.username,
            "client_company": client.company_name,
            "claimed_value": claim.claimed_value,
            "status": claim.status,
            "claimed_at": claim.claimed_at,
            "wagering_completed": claim.wagering_completed,
            "wagering_required": claim.wagering_required,
            "requires_screenshot": promotion.requires_screenshot,
            "screenshot_url": claim.screenshot_url
        })

    return result


@router.get("/wallet", response_model=schemas.PlayerWalletResponse)
async def get_player_wallet(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current player's wallet with bonus balances"""
    if current_user.user_type != UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players can view wallet")

    wallet = db.query(models.PlayerWallet).filter(
        models.PlayerWallet.player_id == current_user.id
    ).first()

    if not wallet:
        # Create wallet if doesn't exist
        wallet = models.PlayerWallet(
            player_id=current_user.id,
            main_balance=current_user.credits,
            bonus_balances='{}'
        )
        db.add(wallet)
        db.commit()
        db.refresh(wallet)

    return schemas.PlayerWalletResponse(
        player_id=wallet.player_id,
        main_balance=wallet.main_balance,
        bonus_balances=json.loads(wallet.bonus_balances),
        total_wagering=wallet.total_wagering,
        last_updated=wallet.last_updated
    )


@router.put("/{promotion_id}/update")
async def update_promotion(
    promotion_id: int,
    update_data: schemas.PromotionUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a promotion (Client only)"""
    if current_user.user_type != UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can update promotions")

    promotion = db.query(models.Promotion).filter(
        models.Promotion.id == promotion_id,
        models.Promotion.client_id == current_user.id
    ).first()

    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")

    if promotion.status != PromotionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Can only update active promotions")

    # Update fields if provided
    if update_data.title is not None:
        promotion.title = update_data.title
    if update_data.description is not None:
        promotion.description = update_data.description
    if update_data.value is not None:
        promotion.value = update_data.value
    if update_data.max_claims_per_player is not None:
        promotion.max_claims_per_player = update_data.max_claims_per_player
    if update_data.total_budget is not None:
        promotion.total_budget = update_data.total_budget
    if update_data.min_player_level is not None:
        promotion.min_player_level = update_data.min_player_level
    if update_data.requires_screenshot is not None:
        promotion.requires_screenshot = update_data.requires_screenshot
    if update_data.end_date is not None:
        promotion.end_date = update_data.end_date
    if update_data.terms is not None:
        promotion.terms = update_data.terms
    if update_data.wagering_requirement is not None:
        promotion.wagering_requirement = update_data.wagering_requirement

    db.commit()
    db.refresh(promotion)

    return _format_promotion_response(promotion, current_user, db)


@router.put("/{promotion_id}/cancel")
async def cancel_promotion(
    promotion_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel a promotion (Client only)"""
    if current_user.user_type != UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can cancel promotions")

    promotion = db.query(models.Promotion).filter(
        models.Promotion.id == promotion_id,
        models.Promotion.client_id == current_user.id
    ).first()

    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")

    if promotion.status != PromotionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Can only cancel active promotions")

    promotion.status = PromotionStatus.CANCELLED
    db.commit()

    return {"message": "Promotion cancelled successfully"}


# Helper function to format promotion response
def _format_promotion_response(promotion: models.Promotion, current_user: models.User, db: Session) -> schemas.PromotionResponse:
    client = promotion.client
    claims_count = len(promotion.claims)

    # Check if current user can claim
    can_claim = False
    already_claimed = False

    if current_user.user_type == UserType.PLAYER:
        # Check if already claimed
        existing_claim = db.query(models.PromotionClaim).filter(
            models.PromotionClaim.promotion_id == promotion.id,
            models.PromotionClaim.player_id == current_user.id
        ).count()

        already_claimed = existing_claim > 0
        # Make end_date timezone-aware if it isn't
        end_date = promotion.end_date
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
        can_claim = (
            not already_claimed and
            existing_claim < promotion.max_claims_per_player and
            promotion.status == PromotionStatus.ACTIVE and
            end_date > datetime.now(timezone.utc) and
            current_user.player_level >= promotion.min_player_level
        )

        # Check if in target players
        if promotion.target_player_ids:
            target_ids = json.loads(promotion.target_player_ids)
            if current_user.id not in target_ids:
                can_claim = False

    return schemas.PromotionResponse(
        id=promotion.id,
        client_id=promotion.client_id,
        client_name=client.full_name or client.username,
        client_company=client.company_name,
        title=promotion.title,
        description=promotion.description,
        promotion_type=promotion.promotion_type,
        value=promotion.value,
        max_claims_per_player=promotion.max_claims_per_player,
        total_budget=promotion.total_budget,
        used_budget=promotion.used_budget,
        min_player_level=promotion.min_player_level,
        requires_screenshot=promotion.requires_screenshot,
        start_date=promotion.start_date,
        end_date=promotion.end_date,
        status=promotion.status,
        terms=promotion.terms,
        wagering_requirement=promotion.wagering_requirement,
        claims_count=claims_count,
        created_at=promotion.created_at,
        can_claim=can_claim,
        already_claimed=already_claimed
    )


@router.get("/pending-approvals", response_model=List[dict])
async def get_pending_approvals(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all pending promotion claim approvals for current client"""
    if current_user.user_type != UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can view pending approvals")

    pending_claims = db.query(models.PromotionClaim).filter(
        models.PromotionClaim.client_id == current_user.id,
        models.PromotionClaim.status == ClaimStatus.PENDING_APPROVAL
    ).order_by(models.PromotionClaim.claimed_at.desc()).all()

    result = []
    for claim in pending_claims:
        player = claim.player
        promotion = claim.promotion

        result.append({
            "claim_id": claim.id,
            "promotion_id": promotion.id,
            "promotion_title": promotion.title,
            "promotion_type": promotion.promotion_type.value,
            "value": claim.claimed_value,
            "player_id": player.id,
            "player_username": player.username,
            "player_level": player.player_level,
            "player_avatar": player.profile_picture,
            "claimed_at": claim.claimed_at.isoformat(),
            "message_id": claim.approval_message_id,
            "requires_screenshot": promotion.requires_screenshot,
            "screenshot_url": claim.screenshot_url
        })

    return result


@router.post("/approve-claim/{claim_id}")
async def approve_promotion_claim(
    claim_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Approve a pending promotion claim (Client only)

    This approves the claim, deducts credits from client, and marks it as APPROVED.
    """
    if current_user.user_type != UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can approve claims")

    # Get the pending claim
    claim = db.query(models.PromotionClaim).filter(
        models.PromotionClaim.id == claim_id,
        models.PromotionClaim.client_id == current_user.id,
        models.PromotionClaim.status == ClaimStatus.PENDING_APPROVAL
    ).first()

    if not claim:
        raise HTTPException(status_code=404, detail="Pending claim not found")

    promotion = claim.promotion
    player = claim.player

    # Check budget
    if promotion.total_budget and promotion.used_budget + claim.claimed_value > promotion.total_budget:
        raise HTTPException(status_code=400, detail="Insufficient promotion budget")

    # Check if client has enough credits
    if current_user.credits < claim.claimed_value:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient credits. You have {current_user.credits} but need {claim.claimed_value}"
        )

    # Deduct credits from client
    current_user.credits -= claim.claimed_value

    # Add credits to player
    player.credits = (player.credits or 0) + claim.claimed_value

    # Update claim status to APPROVED
    claim.status = ClaimStatus.APPROVED
    claim.approved_at = datetime.now(timezone.utc)
    claim.approved_by_id = current_user.id

    # Update promotion used budget
    promotion.used_budget += claim.claimed_value

    # Check if promotion should be marked as depleted
    if promotion.total_budget and promotion.used_budget >= promotion.total_budget:
        promotion.status = PromotionStatus.DEPLETED

    # Create response message to the player
    now = datetime.now(timezone.utc)
    response_message_content = json.dumps({
        "type": "promotion_claim_approved",
        "claim_id": claim.id,
        "promotion_id": promotion.id,
        "promotion_title": promotion.title,
        "promotion_type": promotion.promotion_type.value,
        "value": claim.claimed_value,
        "client_id": current_user.id,
        "client_name": current_user.full_name or current_user.username,
        "player_new_balance": player.credits
    })

    response_message = models.Message(
        sender_id=current_user.id,
        receiver_id=player.id,
        message_type=MessageType.PROMOTION,
        content=response_message_content,
        is_read=False,
        created_at=now
    )

    db.add(response_message)
    db.commit()

    # Send WebSocket notification to the player
    await manager.send_to_user(player.id, WSMessage(
        type=WSMessageType.MESSAGE_NEW,
        data={
            "id": response_message.id,
            "sender_id": current_user.id,
            "sender_name": current_user.full_name or current_user.username,
            "sender_avatar": current_user.profile_picture,
            "sender_type": current_user.user_type.value,
            "receiver_id": player.id,
            "message_type": "promotion",
            "content": response_message_content,
            "is_read": False,
            "created_at": response_message.created_at.isoformat(),
            "room_id": f"dm-{min(current_user.id, player.id)}-{max(current_user.id, player.id)}",
            "promotion_claim": {
                "claim_id": claim.id,
                "promotion_title": promotion.title,
                "promotion_type": promotion.promotion_type.value,
                "value": claim.claimed_value,
                "client_name": current_user.full_name or current_user.username,
                "status": "approved"
            }
        }
    ))

    # Also send a notification event
    await manager.send_to_user(player.id, WSMessage(
        type=WSMessageType.NOTIFICATION,
        data={
            "notification_type": "promotion_approved",
            "claim_id": claim.id,
            "promotion_title": promotion.title,
            "value": claim.claimed_value,
            "message": f"Your claim for '{promotion.title}' has been approved!"
        }
    ))

    return {
        "success": True,
        "message": f"Claim approved! Player can now use the promotion.",
        "claim_id": claim.id,
        "status": "approved"
    }


@router.post("/reject-claim/{claim_id}")
async def reject_promotion_claim(
    claim_id: int,
    rejection_data: Optional[dict] = Body(None),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Reject a pending promotion claim (Client only)
    """
    if current_user.user_type != UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can reject claims")

    reason = rejection_data.get("reason", "") if rejection_data else ""

    # Get the pending claim
    claim = db.query(models.PromotionClaim).filter(
        models.PromotionClaim.id == claim_id,
        models.PromotionClaim.client_id == current_user.id,
        models.PromotionClaim.status == ClaimStatus.PENDING_APPROVAL
    ).first()

    if not claim:
        raise HTTPException(status_code=404, detail="Pending claim not found")

    promotion = claim.promotion
    player = claim.player

    # Update claim status to REJECTED
    claim.status = ClaimStatus.REJECTED
    claim.rejection_reason = reason

    # Create response message to the player
    now = datetime.now(timezone.utc)
    response_message_content = json.dumps({
        "type": "promotion_claim_rejected",
        "claim_id": claim.id,
        "promotion_id": promotion.id,
        "promotion_title": promotion.title,
        "promotion_type": promotion.promotion_type.value,
        "value": claim.claimed_value,
        "client_id": current_user.id,
        "client_name": current_user.full_name or current_user.username,
        "reason": reason
    })

    response_message = models.Message(
        sender_id=current_user.id,
        receiver_id=player.id,
        message_type=MessageType.PROMOTION,
        content=response_message_content,
        is_read=False,
        created_at=now
    )

    db.add(response_message)
    db.commit()

    # Send WebSocket notification to the player
    await manager.send_to_user(player.id, WSMessage(
        type=WSMessageType.MESSAGE_NEW,
        data={
            "id": response_message.id,
            "sender_id": current_user.id,
            "sender_name": current_user.full_name or current_user.username,
            "sender_avatar": current_user.profile_picture,
            "sender_type": current_user.user_type.value,
            "receiver_id": player.id,
            "message_type": "promotion",
            "content": response_message_content,
            "is_read": False,
            "created_at": response_message.created_at.isoformat(),
            "room_id": f"dm-{min(current_user.id, player.id)}-{max(current_user.id, player.id)}",
            "promotion_claim": {
                "claim_id": claim.id,
                "promotion_title": promotion.title,
                "promotion_type": promotion.promotion_type.value,
                "value": claim.claimed_value,
                "client_name": current_user.full_name or current_user.username,
                "status": "rejected",
                "reason": reason
            }
        }
    ))

    # Also send a notification event
    await manager.send_to_user(player.id, WSMessage(
        type=WSMessageType.NOTIFICATION,
        data={
            "notification_type": "promotion_rejected",
            "claim_id": claim.id,
            "promotion_title": promotion.title,
            "reason": reason,
            "message": f"Your claim for '{promotion.title}' was rejected." + (f" Reason: {reason}" if reason else "")
        }
    ))

    return {
        "success": True,
        "message": "Claim rejected",
        "claim_id": claim.id,
        "status": "rejected"
    }
