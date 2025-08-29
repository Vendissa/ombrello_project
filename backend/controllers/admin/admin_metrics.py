from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from typing import Optional
from dependencies import get_db

router = APIRouter(prefix="/admin/metrics", tags=["admin: metrics"])

def _parse_ymd(s: str, *, end_of_day: bool = False) -> datetime:
    """
    Parse 'YYYY-MM-DD' as UTC midnight. If end_of_day=True, return start of the *next* day
    so it can use range [start, end) (end exclusive).
    """
    try:
        dt = datetime.strptime(s, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date: {s}")
    if end_of_day:
        return dt + timedelta(days=1)
    return dt

@router.get("/summary")
async def summary(
    db: AsyncIOMotorDatabase = Depends(get_db),
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD"),
    date_to:   Optional[str] = Query(None, description="YYYY-MM-DD"),
):
    """
    Returns a compact dashboard summary:
      - active_rentals: number of currently active rentals
      - umbrellas_available: current umbrellas with status='available'
      - revenue: (sum of rental fee over range) / 2
    Range is [date_from, date_to] (inclusive) interpreted as UTC, implemented as [start, end) half-open.
    """
    # --- Dates (UTC, [from, to) exclusive upper bound) ---
    if not date_from or not date_to:
        today = datetime.utcnow().date()
        end = datetime(today.year, today.month, today.day) + timedelta(days=1)
        start = end - timedelta(days=7)
    else:
        start = _parse_ymd(date_from)
        end   = _parse_ymd(date_to, end_of_day=True)
        if end <= start:
            raise HTTPException(status_code=400, detail="date_to must be on/after date_from")

    # --- Active rentals (prefer 'rentals', else fallback to umbrellas.status='rented') ---
    active_rentals = 0
    try:
        active_rentals = await db["rentals"].count_documents({"status": {"$in": ["in_use", "rented"]}})
    except Exception:
        pass
    if active_rentals == 0:
        try:
            active_rentals = await db["umbrellas"].count_documents({"status": "rented"})
        except Exception:
            active_rentals = 0

    # --- Umbrellas available (point-in-time) ---
    try:
        umbrellas_available = await db["umbrellas"].count_documents({"status": "available"})
    except Exception:
        umbrellas_available = 0

    # --- Earnings from rentals: sum(fee)/2 within [start, end) using rented_at ---
    revenue = 0.0
    try:
        pipeline = [
            {"$match": {"rented_at": {"$gte": start, "$lt": end}}},
            {"$group": {
                "_id": None,
                "totalFees": {"$sum": {"$toDouble": {"$ifNull": ["$fee", 0]}}}
            }},
            {"$project": {"_id": 0, "earnings": {"$divide": ["$totalFees", 2]}}},
        ]
        doc = await db["rentals"].aggregate(pipeline).to_list(length=1)
        revenue = float(doc[0]["earnings"]) if doc else 0.0
    except Exception:
        revenue = 0.0

    return {
        "active_rentals": int(active_rentals),
        "umbrellas_available": int(umbrellas_available),
        "revenue": round(revenue, 2),  
        "date_from": start.isoformat() + "Z",
        "date_to":   (end - timedelta(milliseconds=1)).isoformat() + "Z",
    }