from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PaymentMethodBase(BaseModel):
    name: str
    display_name: str
    icon_url: Optional[str] = None
    is_active: bool = True

class PaymentMethodCreate(PaymentMethodBase):
    pass

class PaymentMethodResponse(PaymentMethodBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ClientPaymentMethodUpdate(BaseModel):
    payment_method_ids: List[int]

class ClientPaymentMethodResponse(BaseModel):
    id: int
    payment_method: PaymentMethodResponse
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ClientPaymentMethodsResponse(BaseModel):
    accepted_methods: List[PaymentMethodResponse]


# Player Payment Preferences
class PaymentMethodDetail(BaseModel):
    """Details for a specific payment method (e.g., PayPal email, crypto address)"""
    method_id: int
    method_name: str
    method_display_name: str
    account_info: Optional[str] = None  # e.g., "player@paypal.com" or "bc1q..."


class PlayerPaymentPreferencesUpdate(BaseModel):
    """Request to update player's payment preferences"""
    receive_methods: List[int]  # List of payment method IDs player can receive
    send_methods: List[int]  # List of payment method IDs player can send
    receive_details: Optional[dict] = {}  # {method_id: account_info}
    send_details: Optional[dict] = {}  # {method_id: account_info}


class PlayerPaymentPreferencesResponse(BaseModel):
    """Response containing player's payment preferences"""
    player_id: int
    receive_methods: List[PaymentMethodDetail]
    send_methods: List[PaymentMethodDetail]
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PlayerPaymentPreferencesSummary(BaseModel):
    """Summary of player's payment preferences for client view"""
    player_id: int
    player_username: str
    receive_methods: List[PaymentMethodDetail]
    send_methods: List[PaymentMethodDetail]
