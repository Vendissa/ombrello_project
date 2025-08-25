# schemas/admin/umbrellas.py
from pydantic import BaseModel, Field
from typing import Optional, List

class UmbrellaCreateRequest(BaseModel):
    vendor_id: Optional[str] = None
    city: Optional[str] = None
    status: Optional[str] = Field(default="available", pattern="^(available|in_use|broken|lost)$")
    umbrella_code: Optional[str] = None  # optional override

class UmbrellaResponse(BaseModel):
    id: str
    umbrella_code: str
    qr_code: str
    qr_payload: str
    status: str
    vendor_id: Optional[str] = None
    city: Optional[str] = None

class UmbrellaListResponse(BaseModel):
    items: List[UmbrellaResponse]
    total: int
    page: int
    page_size: int

class UmbrellaBulkExportRequest(BaseModel):
    umbrella_ids: Optional[List[str]] = None
    vendor_id: Optional[str] = None
    city: Optional[str] = None
    count: Optional[int] = None
    format: str = Field("pdf", pattern="^(pdf|zip)$")