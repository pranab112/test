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
