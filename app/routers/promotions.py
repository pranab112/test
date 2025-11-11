from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import json
from app import models, schemas, auth
from app.database import get_db
from app.models import UserType, PromotionStatus, PromotionType, ClaimStatus

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

    # Create the promotion
    db_promotion = models.Promotion(
        client_id=current_user.id,
        title=promotion.title,
        description=promotion.description,
        promotion_type=promotion.promotion_type,
        value=promotion.value,
        max_claims_per_player=promotion.max_claims_per_player,
        total_budget=promotion.total_budget,
        min_player_level=promotion.min_player_level,
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
    query = db.query(models.Promotion).filter(
        models.Promotion.client_id.in_(client_ids),
        models.Promotion.status == PromotionStatus.ACTIVE,
        models.Promotion.end_date > datetime.utcnow()
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
    """Claim a promotion (Player only)"""
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

    # Check if promotion has expired
    if promotion.end_date < datetime.utcnow():
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

    # Check if already claimed max times
    existing_claims = db.query(models.PromotionClaim).filter(
        models.PromotionClaim.promotion_id == claim_request.promotion_id,
        models.PromotionClaim.player_id == current_user.id
    ).count()

    if existing_claims >= promotion.max_claims_per_player:
        return schemas.PromotionClaimResponse(
            success=False,
            message=f"Already claimed maximum times ({promotion.max_claims_per_player})"
        )

    # Check budget if applicable
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

    # Create the claim
    wagering_required = promotion.value * promotion.wagering_requirement

    claim = models.PromotionClaim(
        promotion_id=promotion.id,
        player_id=current_user.id,
        client_id=promotion.client_id,
        claimed_value=promotion.value,
        wagering_required=wagering_required
    )

    db.add(claim)

    # Update promotion used budget
    promotion.used_budget += promotion.value

    # Get or create player wallet
    wallet = db.query(models.PlayerWallet).filter(
        models.PlayerWallet.player_id == current_user.id
    ).first()

    if not wallet:
        wallet = models.PlayerWallet(
            player_id=current_user.id,
            main_balance=0,
            bonus_balances='{}'
        )
        db.add(wallet)

    # Update wallet based on promotion type
    if promotion.promotion_type in [PromotionType.BONUS, PromotionType.CREDITS]:
        # Add to bonus balance for this client
        bonus_balances = json.loads(wallet.bonus_balances)
        client_key = str(promotion.client_id)

        if client_key not in bonus_balances:
            bonus_balances[client_key] = {"bonus": 0, "wagering_required": 0}

        bonus_balances[client_key]["bonus"] += promotion.value
        bonus_balances[client_key]["wagering_required"] += wagering_required

        wallet.bonus_balances = json.dumps(bonus_balances)

    # Add credits directly to player's credits field
    if promotion.promotion_type == PromotionType.CREDITS:
        current_user.credits += promotion.value

    db.commit()

    # Send notification via WebSocket (implemented later)

    return schemas.PromotionClaimResponse(
        success=True,
        message="Promotion claimed successfully!",
        claim_id=claim.id,
        claimed_value=promotion.value,
        new_balance=wallet.main_balance + promotion.value if promotion.promotion_type == PromotionType.CREDITS else wallet.main_balance,
        wagering_required=wagering_required if promotion.wagering_requirement > 1 else None
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
            "wagering_required": claim.wagering_required
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
        can_claim = (
            not already_claimed and
            existing_claim < promotion.max_claims_per_player and
            promotion.status == PromotionStatus.ACTIVE and
            promotion.end_date > datetime.now(timezone.utc) and
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


@router.post("/approve-claim")
async def approve_promotion_claim(
    claim_data: dict,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Approve a promotion claim (Client only)"""
    if current_user.user_type != UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can approve claims")

    promotion_id = claim_data.get("promotion_id")
    player_id = claim_data.get("player_id")

    # Verify the promotion belongs to this client
    promotion = db.query(models.Promotion).filter(
        models.Promotion.id == promotion_id,
        models.Promotion.client_id == current_user.id
    ).first()

    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found or you don't own it")

    # Get the player
    player = db.query(models.User).filter(
        models.User.id == player_id,
        models.User.user_type == UserType.PLAYER
    ).first()

    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Check if already claimed
    existing_claim = db.query(models.PromotionClaim).filter(
        models.PromotionClaim.promotion_id == promotion_id,
        models.PromotionClaim.player_id == player_id
    ).first()

    if existing_claim:
        raise HTTPException(status_code=400, detail="Player already claimed this promotion")

    # Check budget
    claim_value = promotion.value
    if promotion.total_budget and promotion.used_budget + claim_value > promotion.total_budget:
        raise HTTPException(status_code=400, detail="Insufficient promotion budget")

    # Create the claim
    new_claim = models.PromotionClaim(
        promotion_id=promotion_id,
        player_id=player_id,
        client_id=current_user.id,
        claimed_value=claim_value,
        status=ClaimStatus.CLAIMED,
        wagering_required=claim_value * promotion.wagering_requirement
    )

    # Update player credits based on promotion type
    if promotion.promotion_type in [PromotionType.BONUS, PromotionType.CREDITS]:
        player.credits += claim_value
    elif promotion.promotion_type == PromotionType.FREE_SPINS:
        # In a real system, this would add free spins to player account
        pass
    elif promotion.promotion_type == PromotionType.CASHBACK:
        # Cashback would be calculated based on losses
        player.credits += claim_value

    # Update promotion budget
    promotion.used_budget += claim_value

    # Check if promotion should be marked as depleted
    if promotion.total_budget and promotion.used_budget >= promotion.total_budget:
        promotion.status = PromotionStatus.DEPLETED

    db.add(new_claim)
    db.commit()

    return {
        "success": True,
        "message": f"Claim approved! {claim_value} credits added to player account.",
        "claim_id": new_claim.id,
        "player_new_balance": player.credits
    }
