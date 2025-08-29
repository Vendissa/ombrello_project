# backend/controllers/vendors.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta, timezone
from dependencies import get_current_vendor, get_db
from schemas.vendor import VendorMe, VendorLocationUpdate
from motor.motor_asyncio import AsyncIOMotorDatabase
from crud.rentals import update_vendor_location, list_vendors_with_locations

router = APIRouter(prefix="/vendors", tags=["vendors"])

def _vendor_out(v: Dict[str, Any]) -> Dict[str, Any]:
    out = {
        "id": str(v["_id"]),
        "email": v.get("email"),
        "telephone": v.get("telephone"),
        "shop_name": v.get("shop_name"),
        "status": v.get("status", "active"),
        "address": v.get("address"),
    }
    loc = v.get("location")
    if loc and isinstance(loc, dict) and "coordinates" in loc:
        out["location"] = {
            "type": "Point",
            "coordinates": [float(loc["coordinates"][0]), 
                            float(loc["coordinates"][1])],
        }
    else:
        out["location"] = None
    return out

@router.get("/me", response_model=VendorMe)
async def get_me(vendor=Depends(get_current_vendor)):
    """
    Return the authenticated vendor's profile.
    Relies on `get_current_vendor` to validate the token and fetch the vendor doc.
    """
    return _vendor_out(vendor)


@router.patch("/me/location", response_model=VendorMe, status_code=status.HTTP_200_OK)
async def update_me_location(
    body: VendorLocationUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    vendor = Depends(get_current_vendor),
):
    updated = await update_vendor_location(
        db,
        str(vendor["_id"]),
        body.to_geopoint().model_dump(),
        address=body.address,
    )
    if not updated:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update location")
    return _vendor_out(updated)

@router.get("/locations")
async def vendors_with_locations(
    db: AsyncIOMotorDatabase = Depends(get_db),
    limit: int = Query(200, ge=1, le=1000),
):
    """
    Returns vendors that have a valid GeoJSON Point in `location`.
    Great for showing all pins without doing a radius search.
    """
    docs = await list_vendors_with_locations(db, limit=limit)
    return [_vendor_out(v) for v in docs]


# --- Optional convenience endpoint (useful during wiring/testing) ---
@router.get("/health")
async def health():
    return {"ok": True, "service": "vendors"}

# backend/controllers/vendors.py  (inside the same router)
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from fastapi import Query

@router.get("/me/earnings/summary")
async def vendor_earnings_summary(
    db: AsyncIOMotorDatabase = Depends(get_db),
    vendor = Depends(get_current_vendor),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    tz: str = Query("UTC"),
):
    vid = str(vendor["_id"])

    now_utc = datetime.now(timezone.utc)
    start = date_from or (now_utc - timedelta(days=30))
    end = date_to or now_utc

    pipeline: List[Dict[str, Any]] = [
        {"$match": {"vendor_id": vid, "fee": {"$ne": None}}},
        {"$addFields": {
            "effDate": {"$ifNull": ["$returned_at", "$rented_at"]},
            "feeNum": {"$toDouble": "$fee"},
        }},
        {"$match": {"effDate": {"$gte": start, "$lte": end}}},
        {"$facet": {
            "totals": [
                {"$group": {
                    "_id": None,
                    "total_fee": {"$sum": "$feeNum"},
                    "count": {"$sum": 1},
                }},
            ],
            "daily": [
                {"$group": {
                    "_id": {"$dateTrunc": {"date": "$effDate", "unit": "day", "timezone": tz}},
                    "total_fee": {"$sum": "$feeNum"},
                    # shares per day (50/50)
                    "vendor_share": {"$sum": {"$divide": ["$feeNum", 2]}},
                    "admin_share":  {"$sum": {"$divide": ["$feeNum", 2]}},
                    "count": {"$sum": 1},
                }},
                {"$project": {
                    "_id": 0,
                    "date": "$_id",
                    "total_fee": 1,
                    "vendor_share": 1,
                    "admin_share": 1,
                    "count": 1,
                }},
                {"$sort": {"date": 1}},
            ],
        }},
    ]

    faceted = await db.rentals.aggregate(pipeline).to_list(length=1)
    totals_doc = (faceted[0].get("totals") or [{}])[0] if faceted else {}

    total_fee = float(totals_doc.get("total_fee", 0.0))
    count = int(totals_doc.get("count", 0))
    vendor_total = total_fee / 2.0
    admin_total = total_fee / 2.0

    return {
        "range": {"from": start, "to": end, "tz": tz},
        "total_fee": total_fee,
        "count": count,
        "vendor_share": vendor_total,
        "admin_share": admin_total,
        "daily": faceted[0].get("daily") if faceted else [],
    }

@router.get("/me/earnings/recent")
async def vendor_earnings_recent(
    db: AsyncIOMotorDatabase = Depends(get_db),
    vendor = Depends(get_current_vendor),
    limit: int = Query(50, ge=1, le=500),
):
    vid = str(vendor["_id"])
    pipeline: List[Dict[str, Any]] = [
        {"$match": {"vendor_id": vid, "fee": {"$ne": None}}},
        {"$addFields": {
            "effDate": {"$ifNull": ["$returned_at", "$rented_at"]},
            "feeNum": {"$toDouble": "$fee"},
        }},
        {"$sort": {"effDate": -1}},
        {"$limit": limit},
        {"$project": {
            "_id": 0,
            "id": {"$toString": "$_id"},
            "rental_id": 1,
            "code": 1,
            "shop_name": 1,
            "user_name": 1,
            "rented_at": 1,
            "returned_at": 1,
            "fee": "$feeNum",
            "effective_at": "$effDate",
            # 50/50 split
            "vendor_share": {"$divide": ["$feeNum", 2]},
            "admin_share":  {"$divide": ["$feeNum", 2]},
        }},
    ]
    return await db.rentals.aggregate(pipeline).to_list(length=limit)