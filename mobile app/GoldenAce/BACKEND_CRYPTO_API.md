# Backend API Requirements for Crypto Payments

## Database Models

### CryptoWallet (Admin's wallets)
```python
class CryptoWallet(Base):
    __tablename__ = "crypto_wallets"

    id = Column(Integer, primary_key=True)
    crypto_type = Column(String, nullable=False)  # BTC, ETH, USDT, USDC
    wallet_address = Column(String, nullable=False)
    network = Column(String, nullable=True)  # ERC20, TRC20, BEP20 for USDT
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### CryptoPurchase
```python
class CryptoPurchase(Base):
    __tablename__ = "crypto_purchases"

    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reference_code = Column(String, unique=True, nullable=False)  # e.g., "GP-ABC123"
    crypto_type = Column(String, nullable=False)  # BTC, ETH, USDT, USDC
    crypto_amount = Column(String, nullable=False)  # Amount in crypto
    usd_amount = Column(Float, nullable=False)
    credits_amount = Column(Integer, nullable=False)
    wallet_address = Column(String, nullable=False)  # Admin wallet used
    tx_hash = Column(String, nullable=True)  # Client submits after payment
    status = Column(String, default="pending")  # pending, confirmed, rejected, expired
    admin_notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=False)  # e.g., 24 hours from creation

    client = relationship("User", back_populates="crypto_purchases")
```

### Add to User model
```python
# Add to existing User model
credits = Column(Integer, default=0)
```

## API Endpoints

### 1. GET /api/v1/crypto/wallets
Get active admin wallet addresses (for clients to see where to send)

**Response:**
```json
[
  {
    "crypto_type": "BTC",
    "wallet_address": "bc1q...",
    "network": null,
    "is_active": true
  },
  {
    "crypto_type": "USDT",
    "wallet_address": "0x...",
    "network": "ERC20",
    "is_active": true
  }
]
```

### 2. GET /api/v1/crypto/rates
Get current credit rates and crypto prices

**Response:**
```json
{
  "rates": {
    "credits_per_dollar": 100,
    "min_purchase": 10,
    "max_purchase": 10000
  },
  "crypto_prices": {
    "BTC": 45000,
    "ETH": 2500,
    "USDT": 1,
    "USDC": 1
  }
}
```

**Note:** Use a crypto price API like CoinGecko for live prices:
```python
import requests

def get_crypto_prices():
    url = "https://api.coingecko.com/api/v3/simple/price"
    params = {
        "ids": "bitcoin,ethereum,tether,usd-coin",
        "vs_currencies": "usd"
    }
    response = requests.get(url, params=params)
    data = response.json()
    return {
        "BTC": data["bitcoin"]["usd"],
        "ETH": data["ethereum"]["usd"],
        "USDT": data["tether"]["usd"],
        "USDC": data["usd-coin"]["usd"]
    }
```

### 3. POST /api/v1/crypto/purchase
Create a new purchase request

**Request:**
```json
{
  "crypto_type": "BTC",
  "usd_amount": 100
}
```

**Response:**
```json
{
  "id": 1,
  "client_id": 123,
  "reference_code": "GP-A1B2C3",
  "crypto_type": "BTC",
  "crypto_amount": "0.00222222",
  "usd_amount": 100,
  "credits_amount": 10000,
  "wallet_address": "bc1q...",
  "status": "pending",
  "created_at": "2024-01-15T10:00:00Z",
  "expires_at": "2024-01-16T10:00:00Z"
}
```

### 4. GET /api/v1/crypto/my-purchases
Get client's purchase history

**Response:** Array of CryptoPurchase objects

### 5. GET /api/v1/crypto/purchase/{id}
Get specific purchase details

### 6. PUT /api/v1/crypto/purchase/{id}/tx-hash
Client submits transaction hash after payment

**Request:**
```json
{
  "tx_hash": "0x123abc..."
}
```

### 7. DELETE /api/v1/crypto/purchase/{id}
Cancel a pending purchase (only if status is pending)

---

## Admin Endpoints (for web admin panel)

### 8. GET /api/v1/admin/crypto/purchases
Get all purchases with filters

**Query params:** `status`, `client_id`, `page`, `limit`

### 9. PUT /api/v1/admin/crypto/purchases/{id}/confirm
Admin confirms payment and adds credits

**Request:**
```json
{
  "admin_notes": "Verified on blockchain"
}
```

**Backend logic:**
```python
def confirm_purchase(purchase_id: int, admin_notes: str):
    purchase = db.query(CryptoPurchase).get(purchase_id)
    if purchase.status != "pending":
        raise HTTPException(400, "Purchase already processed")

    # Update purchase
    purchase.status = "confirmed"
    purchase.confirmed_at = datetime.utcnow()
    purchase.admin_notes = admin_notes

    # Add credits to client
    client = db.query(User).get(purchase.client_id)
    client.credits += purchase.credits_amount

    db.commit()

    # Optional: Send notification to client
    # notification_service.send(client_id, "Credits Added", f"{purchase.credits_amount} credits added!")

    return purchase
```

### 10. PUT /api/v1/admin/crypto/purchases/{id}/reject
Admin rejects a purchase

**Request:**
```json
{
  "admin_notes": "Transaction not found on blockchain"
}
```

### 11. Admin Wallet Management
- `GET /api/v1/admin/crypto/wallets` - List all wallets
- `POST /api/v1/admin/crypto/wallets` - Add wallet
- `PUT /api/v1/admin/crypto/wallets/{id}` - Update wallet
- `DELETE /api/v1/admin/crypto/wallets/{id}` - Remove wallet

### 12. Admin Settings
- `GET /api/v1/admin/crypto/settings` - Get rate settings
- `PUT /api/v1/admin/crypto/settings` - Update rates

---

## Scheduled Tasks

### Expire old purchases
Run every hour to expire purchases older than 24 hours:
```python
def expire_old_purchases():
    expired = db.query(CryptoPurchase).filter(
        CryptoPurchase.status == "pending",
        CryptoPurchase.expires_at < datetime.utcnow()
    ).all()

    for purchase in expired:
        purchase.status = "expired"

    db.commit()
```

---

## Flow Summary

1. **Client opens Buy Credits screen**
   - App calls `GET /crypto/wallets` and `GET /crypto/rates`
   - Shows available crypto options and current rates

2. **Client selects crypto and enters amount**
   - App calculates credits and crypto amount
   - Client taps "Continue"

3. **App creates purchase request**
   - `POST /crypto/purchase` creates a pending purchase
   - Returns reference code and wallet address

4. **Client makes payment externally**
   - Client sends crypto to the shown wallet address
   - Uses any crypto wallet app (Trust Wallet, MetaMask, etc.)

5. **Client submits transaction hash**
   - After payment, client pastes TX hash
   - `PUT /crypto/purchase/{id}/tx-hash`

6. **Admin verifies and confirms**
   - Admin checks TX on blockchain explorer
   - `PUT /admin/crypto/purchases/{id}/confirm`
   - Credits automatically added to client account

7. **Client sees credits**
   - Next time client loads dashboard, credits are updated
