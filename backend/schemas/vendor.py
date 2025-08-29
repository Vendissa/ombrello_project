# backend/schemas/vendor.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal

class GeoPoint(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: List[float]  # [lng, lat]

    @field_validator("coordinates")
    @classmethod
    def validate_coords(cls, v: List[float]) -> List[float]:
        if not (isinstance(v, list) and len(v) == 2):
            raise ValueError("coordinates must be [lng, lat]")
        lng, lat = v
        if not (-180 <= float(lng) <= 180 and -90 <= float(lat) <= 90):
            raise ValueError("invalid lng/lat")
        # ensure floats
        return [float(lng), float(lat)]

class VendorMe(BaseModel):
    id: str
    email: Optional[str] = None
    telephone: Optional[str] = None
    shop_name: Optional[str] = None
    shop_owner_name: Optional[str] = None
    status: Optional[str] = "active"
    location: Optional[GeoPoint] = None

class VendorLocationUpdate(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None

    def to_geopoint(self) -> GeoPoint:
        # GeoJSON uses [lng, lat] order
        return GeoPoint(coordinates=[float(self.lng), float(self.lat)])
    
class VendorLocationUpdate(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None

    def to_geopoint(self) -> GeoPoint:
        return GeoPoint(coordinates=[self.lng, self.lat])
