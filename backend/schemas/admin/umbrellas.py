from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

UmbrellaStatus = Literal["available", "rented", "maintenance", "lost", "retired"]
UmbrellaCondition = Literal["good", "worn", "needs_repair", "broken"]

class UmbrellaBase(BaseModel):
    # code is optional on input (it will be auto-generated if omitted)
    code: Optional[str] = Field(default=None, min_length=3, max_length=64)
    vendor_id: str                                            
    shop_name: Optional[str] = None                             
    status: UmbrellaStatus = "available"
    condition: UmbrellaCondition = "good"
    rented_date: Optional[datetime] = None                    

class CreateUmbrella(UmbrellaBase):
    pass

class UpdateUmbrella(BaseModel):
    vendor_id: Optional[str] = None
    shop_name: Optional[str] = None
    status: Optional[UmbrellaStatus] = None
    condition: Optional[UmbrellaCondition] = None
    rented_date: Optional[datetime] = None

class UmbrellaOut(UmbrellaBase):
    id: str
    created_at: datetime
    updated_at: datetime
    qr_value: str
    condition: Optional[str]
    updated_at: Optional[datetime]

class BulkAddUmbrellas(BaseModel):
    vendor_id: str
    shop_name: Optional[str] = None
    count: int = Field(..., ge=1, le=1000)

class ReportBrokenUmbrella(BaseModel):
    code: str
