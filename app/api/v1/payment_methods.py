from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
import json
from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/payment-methods", tags=["payment_methods"])


def get_payment_method_details(
    method_ids: List[int],
    details: dict,
    db: Session
) -> List[schemas.PaymentMethodDetail]:
    """Helper function to get payment method details with account info"""
    if not method_ids:
        return []

    methods = db.query(models.PaymentMethod).filter(
        models.PaymentMethod.id.in_(method_ids),
        models.PaymentMethod.is_active == True
    ).all()

    result = []
    for method in methods:
        result.append(schemas.PaymentMethodDetail(
            method_id=method.id,
            method_name=method.name,
            method_display_name=method.display_name,
            account_info=details.get(str(method.id))
        ))
    return result

@router.get("/", response_model=List[schemas.PaymentMethodResponse])
async def get_payment_methods(
    db: Session = Depends(get_db)
):
    """Get all available payment methods"""
    payment_methods = db.query(models.PaymentMethod).filter(
        models.PaymentMethod.is_active == True
    ).all()

    return payment_methods

@router.get("/client/{client_id}", response_model=schemas.ClientPaymentMethodsResponse)
async def get_client_payment_methods(
    client_id: int,
    db: Session = Depends(get_db)
):
    """Get payment methods accepted by a specific client"""

    # Get client's accepted payment methods
    client_methods = db.query(models.ClientPaymentMethod).join(
        models.PaymentMethod
    ).filter(
        and_(
            models.ClientPaymentMethod.client_id == client_id,
            models.ClientPaymentMethod.is_active == True,
            models.PaymentMethod.is_active == True
        )
    ).all()

    accepted_methods = [cpm.payment_method for cpm in client_methods]

    return schemas.ClientPaymentMethodsResponse(accepted_methods=accepted_methods)

@router.get("/my-methods", response_model=schemas.ClientPaymentMethodsResponse)
async def get_my_payment_methods(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current client's accepted payment methods"""

    if current_user.user_type != models.UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can access payment methods")

    # Get client's accepted payment methods
    client_methods = db.query(models.ClientPaymentMethod).join(
        models.PaymentMethod
    ).filter(
        and_(
            models.ClientPaymentMethod.client_id == current_user.id,
            models.ClientPaymentMethod.is_active == True,
            models.PaymentMethod.is_active == True
        )
    ).all()

    accepted_methods = [cpm.payment_method for cpm in client_methods]

    return schemas.ClientPaymentMethodsResponse(accepted_methods=accepted_methods)

@router.post("/update-methods")
async def update_client_payment_methods(
    payment_data: schemas.ClientPaymentMethodUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update client's accepted payment methods"""

    if current_user.user_type != models.UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can update payment methods")

    # Validate that all payment method IDs exist
    valid_methods = db.query(models.PaymentMethod).filter(
        and_(
            models.PaymentMethod.id.in_(payment_data.payment_method_ids),
            models.PaymentMethod.is_active == True
        )
    ).all()

    if len(valid_methods) != len(payment_data.payment_method_ids):
        raise HTTPException(status_code=400, detail="Some payment method IDs are invalid")

    # Delete existing client payment methods
    db.query(models.ClientPaymentMethod).filter(
        models.ClientPaymentMethod.client_id == current_user.id
    ).delete()

    # Add new payment methods
    for method_id in payment_data.payment_method_ids:
        client_method = models.ClientPaymentMethod(
            client_id=current_user.id,
            payment_method_id=method_id,
            is_active=True
        )
        db.add(client_method)

    db.commit()

    return {"message": "Payment methods updated successfully"}

@router.delete("/remove-method/{method_id}")
async def remove_payment_method(
    method_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Remove a specific payment method from client's accepted methods"""

    if current_user.user_type != models.UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can remove payment methods")

    # Find and delete the client payment method
    client_method = db.query(models.ClientPaymentMethod).filter(
        and_(
            models.ClientPaymentMethod.client_id == current_user.id,
            models.ClientPaymentMethod.payment_method_id == method_id
        )
    ).first()

    if not client_method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    db.delete(client_method)
    db.commit()

    return {"message": "Payment method removed successfully"}


# ============ Player Payment Preferences ============

@router.get("/player/my-preferences", response_model=schemas.PlayerPaymentPreferencesResponse)
async def get_my_payment_preferences(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current player's payment preferences"""

    if current_user.user_type != models.UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players can access their payment preferences")

    # Get or create preferences
    preferences = db.query(models.PlayerPaymentPreference).filter(
        models.PlayerPaymentPreference.player_id == current_user.id
    ).first()

    if not preferences:
        # Create default preferences
        preferences = models.PlayerPaymentPreference(
            player_id=current_user.id,
            receive_methods='[]',
            send_methods='[]',
            receive_details='{}',
            send_details='{}'
        )
        db.add(preferences)
        db.commit()
        db.refresh(preferences)

    # Parse JSON fields
    receive_method_ids = json.loads(preferences.receive_methods) if preferences.receive_methods else []
    send_method_ids = json.loads(preferences.send_methods) if preferences.send_methods else []
    receive_details = json.loads(preferences.receive_details) if preferences.receive_details else {}
    send_details = json.loads(preferences.send_details) if preferences.send_details else {}

    return schemas.PlayerPaymentPreferencesResponse(
        player_id=current_user.id,
        receive_methods=get_payment_method_details(receive_method_ids, receive_details, db),
        send_methods=get_payment_method_details(send_method_ids, send_details, db),
        updated_at=preferences.updated_at
    )


@router.put("/player/my-preferences", response_model=schemas.PlayerPaymentPreferencesResponse)
async def update_my_payment_preferences(
    data: schemas.PlayerPaymentPreferencesUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current player's payment preferences"""

    if current_user.user_type != models.UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players can update their payment preferences")

    # Validate payment method IDs
    all_method_ids = list(set(data.receive_methods + data.send_methods))
    if all_method_ids:
        valid_methods = db.query(models.PaymentMethod).filter(
            models.PaymentMethod.id.in_(all_method_ids),
            models.PaymentMethod.is_active == True
        ).all()
        valid_ids = {m.id for m in valid_methods}

        invalid_ids = set(all_method_ids) - valid_ids
        if invalid_ids:
            raise HTTPException(status_code=400, detail=f"Invalid payment method IDs: {list(invalid_ids)}")

    # Get or create preferences
    preferences = db.query(models.PlayerPaymentPreference).filter(
        models.PlayerPaymentPreference.player_id == current_user.id
    ).first()

    if not preferences:
        preferences = models.PlayerPaymentPreference(player_id=current_user.id)
        db.add(preferences)

    # Update preferences
    preferences.receive_methods = json.dumps(data.receive_methods)
    preferences.send_methods = json.dumps(data.send_methods)
    preferences.receive_details = json.dumps(data.receive_details or {})
    preferences.send_details = json.dumps(data.send_details or {})

    db.commit()
    db.refresh(preferences)

    # Parse and return
    receive_method_ids = json.loads(preferences.receive_methods) if preferences.receive_methods else []
    send_method_ids = json.loads(preferences.send_methods) if preferences.send_methods else []
    receive_details = json.loads(preferences.receive_details) if preferences.receive_details else {}
    send_details = json.loads(preferences.send_details) if preferences.send_details else {}

    return schemas.PlayerPaymentPreferencesResponse(
        player_id=current_user.id,
        receive_methods=get_payment_method_details(receive_method_ids, receive_details, db),
        send_methods=get_payment_method_details(send_method_ids, send_details, db),
        updated_at=preferences.updated_at
    )


@router.get("/player/{player_id}/preferences", response_model=schemas.PlayerPaymentPreferencesSummary)
async def get_player_payment_preferences(
    player_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a player's payment preferences (for clients to view their players' preferences)"""

    if current_user.user_type != models.UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can view player payment preferences")

    # Verify the player belongs to this client
    player = db.query(models.User).filter(
        models.User.id == player_id,
        models.User.user_type == models.UserType.PLAYER,
        models.User.registered_by_id == current_user.id
    ).first()

    if not player:
        raise HTTPException(status_code=404, detail="Player not found or not registered by you")

    # Get preferences
    preferences = db.query(models.PlayerPaymentPreference).filter(
        models.PlayerPaymentPreference.player_id == player_id
    ).first()

    if not preferences:
        return schemas.PlayerPaymentPreferencesSummary(
            player_id=player_id,
            player_username=player.username,
            receive_methods=[],
            send_methods=[]
        )

    # Parse JSON fields
    receive_method_ids = json.loads(preferences.receive_methods) if preferences.receive_methods else []
    send_method_ids = json.loads(preferences.send_methods) if preferences.send_methods else []
    receive_details = json.loads(preferences.receive_details) if preferences.receive_details else {}
    send_details = json.loads(preferences.send_details) if preferences.send_details else {}

    return schemas.PlayerPaymentPreferencesSummary(
        player_id=player_id,
        player_username=player.username,
        receive_methods=get_payment_method_details(receive_method_ids, receive_details, db),
        send_methods=get_payment_method_details(send_method_ids, send_details, db)
    )