# backend/schemas/rentals.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AssignRentalIn(BaseModel):
    code: str = Field(..., description="QR-parsed umbrella ID")
    user_id: str = Field(..., description="QR-parsed user ID")
    shop_name: Optional[str] = None
    fee: Optional[float] = None

class RentalOut(BaseModel):
    id: str
    rental_id: str
    code: str
    vendor_id: str
    shop_name: Optional[str] = None
    user_id: str
    user_name: Optional[str] = None
    rented_at: datetime
    returned_at: Optional[datetime] = None
    fee: Optional[float] = None

class ReturnRentalIn(BaseModel):
    code: str

class MyActiveRentalOut(BaseModel):
    id: str
    rental_id: str
    code: Optional[str] = None
    rented_at: datetime