from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/payment-methods", tags=["payment_methods"])

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