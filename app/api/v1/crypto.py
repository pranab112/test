from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from app import models, auth
from app.database import get_db
from app.models import UserType, AdminCryptoWallet, CreditPurchaseRequest, DEFAULT_CREDIT_RATES
from app.websocket import send_credit_update
import logging
import secrets
import string

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crypto", tags=["crypto"])


# ============ Pydantic Schemas (matching mobile app expectations) ============

class CryptoWalletResponse(BaseModel):
    crypto_type: str
    wallet_address: str
    network: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class CreditRateResponse(BaseModel):
    credits_per_dollar: int
    min_purchase: int
    max_purchase: int


class RatesResponse(BaseModel):
    rates: CreditRateResponse
    crypto_prices: dict  # Current USD prices per coin


class CreatePurchaseRequest(BaseModel):
    crypto_type: str
    usd_amount: float = Field(..., gt=0)


class UpdateTxHashRequest(BaseModel):
    tx_hash: str


class PurchaseResponse(BaseModel):
    id: int
    client_id: int
    reference_code: str
    crypto_type: str
    crypto_amount: str
    usd_amount: float
    credits_amount: int
    wallet_address: str
    tx_hash: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    expires_at: datetime

    class Config:
        from_attributes = True


# Admin schemas
class AdminWalletCreate(BaseModel):
    crypto_type: str = Field(..., max_length=20)
    network: Optional[str] = Field(None, max_length=20)
    wallet_address: str = Field(..., max_length=255)
    is_active: bool = True


class AdminWalletUpdate(BaseModel):
    crypto_type: Optional[str] = None
    network: Optional[str] = None
    wallet_address: Optional[str] = None
    is_active: Optional[bool] = None


class AdminWalletResponse(BaseModel):
    id: int
    crypto_type: str
    network: Optional[str] = None
    wallet_address: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AdminPurchaseAction(BaseModel):
    action: str = Field(..., pattern="^(confirm|reject)$")
    admin_notes: Optional[str] = None


# ============ Helper Functions ============

def get_admin_user(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.user_type != UserType.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def get_client_user(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.user_type != UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Client access required")
    return current_user


def generate_reference_code() -> str:
    """Generate a unique reference code for purchase tracking"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))


def get_crypto_prices() -> dict:
    """Get approximate crypto prices in USD (in production, use a real API like CoinGecko)"""
    # These are approximate prices - in production, fetch from a price API
    return {
        "BTC": 45000.00,
        "ETH": 2500.00,
        "USDT": 1.00,
        "USDC": 1.00,
    }


# ============ Client Endpoints ============

@router.get("/wallets", response_model=List[CryptoWalletResponse])
def get_wallets(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get available admin crypto wallet addresses for payment"""
    wallets = db.query(AdminCryptoWallet).filter(
        AdminCryptoWallet.is_active == True
    ).order_by(AdminCryptoWallet.display_order).all()

    return [
        CryptoWalletResponse(
            crypto_type=w.currency,
            wallet_address=w.wallet_address,
            network=w.network,
            is_active=w.is_active
        )
        for w in wallets
    ]


@router.get("/rates", response_model=RatesResponse)
def get_rates(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current credit rates and crypto prices"""
    return RatesResponse(
        rates=CreditRateResponse(
            credits_per_dollar=100,  # 100 credits = $1
            min_purchase=10,  # $10 minimum
            max_purchase=10000  # $10,000 maximum
        ),
        crypto_prices=get_crypto_prices()
    )


@router.post("/purchase", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
def create_purchase(
    request_data: CreatePurchaseRequest,
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """Create a new credit purchase request"""
    # Find the wallet for this crypto type
    wallet = db.query(AdminCryptoWallet).filter(
        AdminCryptoWallet.currency == request_data.crypto_type,
        AdminCryptoWallet.is_active == True
    ).first()

    if not wallet:
        raise HTTPException(status_code=400, detail=f"No active wallet found for {request_data.crypto_type}")

    # Validate amount
    if request_data.usd_amount < 10:
        raise HTTPException(status_code=400, detail="Minimum purchase is $10")
    if request_data.usd_amount > 10000:
        raise HTTPException(status_code=400, detail="Maximum purchase is $10,000")

    # Calculate crypto amount
    crypto_prices = get_crypto_prices()
    crypto_price = crypto_prices.get(request_data.crypto_type, 1.0)
    crypto_amount = request_data.usd_amount / crypto_price

    # Calculate credits (100 credits per dollar)
    credits_amount = int(request_data.usd_amount * 100)

    # Generate reference code
    reference_code = generate_reference_code()
    while db.query(CreditPurchaseRequest).filter(
        CreditPurchaseRequest.transaction_hash == reference_code
    ).first():
        reference_code = generate_reference_code()

    # Create purchase request (expires in 24 hours)
    now = datetime.now(timezone.utc)
    purchase = CreditPurchaseRequest(
        client_id=client.id,
        wallet_id=wallet.id,
        credits_amount=credits_amount,
        crypto_amount=Decimal(str(crypto_amount)),
        currency=request_data.crypto_type,
        network=wallet.network or "",
        exchange_rate=Decimal(str(crypto_price)),
        status="pending"
    )
    # Store reference_code in a way that works with existing model
    # We'll use sender_wallet_address temporarily to store reference (should add proper field later)

    db.add(purchase)
    db.commit()
    db.refresh(purchase)

    logger.info(f"Client {client.username} created purchase request #{purchase.id}: ${request_data.usd_amount} for {credits_amount} credits")

    return PurchaseResponse(
        id=purchase.id,
        client_id=purchase.client_id,
        reference_code=f"CP{purchase.id:06d}",  # Generate from ID
        crypto_type=purchase.currency,
        crypto_amount=f"{crypto_amount:.8f}",
        usd_amount=request_data.usd_amount,
        credits_amount=credits_amount,
        wallet_address=wallet.wallet_address,
        tx_hash=purchase.transaction_hash,
        status=purchase.status,
        admin_notes=purchase.admin_notes,
        created_at=purchase.created_at,
        confirmed_at=purchase.processed_at,
        expires_at=now + timedelta(hours=24)
    )


@router.get("/my-purchases", response_model=List[PurchaseResponse])
def get_my_purchases(
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """Get client's purchase history"""
    purchases = db.query(CreditPurchaseRequest).filter(
        CreditPurchaseRequest.client_id == client.id
    ).order_by(CreditPurchaseRequest.created_at.desc()).all()

    result = []
    for p in purchases:
        wallet = db.query(AdminCryptoWallet).filter(AdminCryptoWallet.id == p.wallet_id).first()
        result.append(PurchaseResponse(
            id=p.id,
            client_id=p.client_id,
            reference_code=f"CP{p.id:06d}",
            crypto_type=p.currency,
            crypto_amount=str(p.crypto_amount),
            usd_amount=float(p.crypto_amount * (p.exchange_rate or Decimal("1"))),
            credits_amount=p.credits_amount,
            wallet_address=wallet.wallet_address if wallet else "",
            tx_hash=p.transaction_hash,
            status=p.status,
            admin_notes=p.admin_notes,
            created_at=p.created_at,
            confirmed_at=p.processed_at,
            expires_at=p.created_at + timedelta(hours=24)
        ))

    return result


@router.put("/purchase/{purchase_id}/tx-hash", response_model=PurchaseResponse)
def submit_tx_hash(
    purchase_id: int,
    request_data: UpdateTxHashRequest,
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """Submit transaction hash after making payment"""
    purchase = db.query(CreditPurchaseRequest).filter(
        CreditPurchaseRequest.id == purchase_id,
        CreditPurchaseRequest.client_id == client.id
    ).first()

    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    if purchase.status != "pending":
        raise HTTPException(status_code=400, detail="Can only update pending purchases")

    purchase.transaction_hash = request_data.tx_hash
    db.commit()
    db.refresh(purchase)

    wallet = db.query(AdminCryptoWallet).filter(AdminCryptoWallet.id == purchase.wallet_id).first()

    logger.info(f"Client {client.username} submitted tx hash for purchase #{purchase_id}")

    return PurchaseResponse(
        id=purchase.id,
        client_id=purchase.client_id,
        reference_code=f"CP{purchase.id:06d}",
        crypto_type=purchase.currency,
        crypto_amount=str(purchase.crypto_amount),
        usd_amount=float(purchase.crypto_amount * (purchase.exchange_rate or Decimal("1"))),
        credits_amount=purchase.credits_amount,
        wallet_address=wallet.wallet_address if wallet else "",
        tx_hash=purchase.transaction_hash,
        status=purchase.status,
        admin_notes=purchase.admin_notes,
        created_at=purchase.created_at,
        confirmed_at=purchase.processed_at,
        expires_at=purchase.created_at + timedelta(hours=24)
    )


@router.delete("/purchase/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_purchase(
    purchase_id: int,
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """Cancel a pending purchase request"""
    purchase = db.query(CreditPurchaseRequest).filter(
        CreditPurchaseRequest.id == purchase_id,
        CreditPurchaseRequest.client_id == client.id
    ).first()

    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    if purchase.status != "pending":
        raise HTTPException(status_code=400, detail="Can only cancel pending purchases")

    purchase.status = "expired"  # Using 'expired' instead of 'cancelled' to match mobile app
    db.commit()

    logger.info(f"Client {client.username} cancelled purchase #{purchase_id}")


# ============ Admin Wallet Management ============

@router.get("/admin/wallets", response_model=List[AdminWalletResponse])
def list_admin_wallets(
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List all admin crypto wallets"""
    wallets = db.query(AdminCryptoWallet).order_by(
        AdminCryptoWallet.display_order,
        AdminCryptoWallet.currency
    ).all()

    return [
        AdminWalletResponse(
            id=w.id,
            crypto_type=w.currency,
            network=w.network,
            wallet_address=w.wallet_address,
            is_active=w.is_active,
            created_at=w.created_at
        )
        for w in wallets
    ]


@router.post("/admin/wallets", response_model=AdminWalletResponse, status_code=status.HTTP_201_CREATED)
def create_admin_wallet(
    wallet_data: AdminWalletCreate,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new admin crypto wallet"""
    wallet = AdminCryptoWallet(
        currency=wallet_data.crypto_type,
        network=wallet_data.network,
        wallet_address=wallet_data.wallet_address,
        is_active=wallet_data.is_active
    )
    db.add(wallet)
    db.commit()
    db.refresh(wallet)

    logger.info(f"Admin {admin.username} created crypto wallet: {wallet.currency}")

    return AdminWalletResponse(
        id=wallet.id,
        crypto_type=wallet.currency,
        network=wallet.network,
        wallet_address=wallet.wallet_address,
        is_active=wallet.is_active,
        created_at=wallet.created_at
    )


@router.put("/admin/wallets/{wallet_id}", response_model=AdminWalletResponse)
def update_admin_wallet(
    wallet_id: int,
    wallet_data: AdminWalletUpdate,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update an admin crypto wallet"""
    wallet = db.query(AdminCryptoWallet).filter(AdminCryptoWallet.id == wallet_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    if wallet_data.crypto_type is not None:
        wallet.currency = wallet_data.crypto_type
    if wallet_data.network is not None:
        wallet.network = wallet_data.network
    if wallet_data.wallet_address is not None:
        wallet.wallet_address = wallet_data.wallet_address
    if wallet_data.is_active is not None:
        wallet.is_active = wallet_data.is_active

    db.commit()
    db.refresh(wallet)

    logger.info(f"Admin {admin.username} updated crypto wallet {wallet_id}")

    return AdminWalletResponse(
        id=wallet.id,
        crypto_type=wallet.currency,
        network=wallet.network,
        wallet_address=wallet.wallet_address,
        is_active=wallet.is_active,
        created_at=wallet.created_at
    )


@router.delete("/admin/wallets/{wallet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_wallet(
    wallet_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete an admin crypto wallet"""
    wallet = db.query(AdminCryptoWallet).filter(AdminCryptoWallet.id == wallet_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    # Check for pending purchases
    pending = db.query(CreditPurchaseRequest).filter(
        CreditPurchaseRequest.wallet_id == wallet_id,
        CreditPurchaseRequest.status == "pending"
    ).count()

    if pending > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete wallet with {pending} pending purchases")

    db.delete(wallet)
    db.commit()

    logger.info(f"Admin {admin.username} deleted crypto wallet {wallet_id}")


# ============ Admin Purchase Management ============

@router.get("/admin/purchases")
def list_all_purchases(
    status_filter: Optional[str] = None,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List all credit purchase requests (admin)"""
    query = db.query(CreditPurchaseRequest).order_by(CreditPurchaseRequest.created_at.desc())

    if status_filter:
        query = query.filter(CreditPurchaseRequest.status == status_filter)

    purchases = query.all()

    result = []
    for p in purchases:
        client = db.query(models.User).filter(models.User.id == p.client_id).first()
        wallet = db.query(AdminCryptoWallet).filter(AdminCryptoWallet.id == p.wallet_id).first()

        result.append({
            "id": p.id,
            "reference_code": f"CP{p.id:06d}",
            "client": {
                "id": client.id,
                "username": client.username,
                "full_name": client.full_name
            } if client else None,
            "crypto_type": p.currency,
            "network": p.network,
            "crypto_amount": str(p.crypto_amount),
            "usd_amount": float(p.crypto_amount * (p.exchange_rate or Decimal("1"))),
            "credits_amount": p.credits_amount,
            "wallet_address": wallet.wallet_address if wallet else "",
            "tx_hash": p.transaction_hash,
            "status": p.status,
            "admin_notes": p.admin_notes,
            "created_at": p.created_at.isoformat(),
            "processed_at": p.processed_at.isoformat() if p.processed_at else None
        })

    return result


@router.post("/confirm/{purchase_id}")
async def confirm_purchase(
    purchase_id: int,
    action_data: AdminPurchaseAction,
    background_tasks: BackgroundTasks,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Confirm or reject a purchase request (admin)"""
    purchase = db.query(CreditPurchaseRequest).filter(
        CreditPurchaseRequest.id == purchase_id
    ).first()

    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    if purchase.status != "pending":
        raise HTTPException(status_code=400, detail="Purchase already processed")

    client = db.query(models.User).filter(models.User.id == purchase.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    purchase.admin_id = admin.id
    purchase.processed_at = datetime.now(timezone.utc)
    purchase.admin_notes = action_data.admin_notes

    if action_data.action == "confirm":
        # Add credits
        client.credits += purchase.credits_amount
        purchase.status = "confirmed"

        # Send real-time update
        usd_amount = float(purchase.crypto_amount * (purchase.exchange_rate or Decimal("1")))
        background_tasks.add_task(
            send_credit_update,
            client.id,
            client.credits,
            purchase.credits_amount,
            f"Credit purchase confirmed (${usd_amount:.2f})"
        )

        logger.info(f"Admin {admin.username} confirmed purchase #{purchase_id}: +{purchase.credits_amount} credits for {client.username}")

        db.commit()
        return {
            "message": f"Confirmed! {purchase.credits_amount} credits added",
            "new_balance": client.credits
        }

    else:  # reject
        purchase.status = "rejected"
        purchase.rejection_reason = action_data.admin_notes

        logger.info(f"Admin {admin.username} rejected purchase #{purchase_id}")

        db.commit()
        return {
            "message": "Purchase rejected",
            "reason": action_data.admin_notes
        }
