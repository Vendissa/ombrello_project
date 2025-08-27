from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from typing import Optional
from dependencies import get_db

router = APIRouter(prefix="/admin/metrics", tags=["admin: metrics"])

def _parse_ymd(s: str, *, end_of_day: bool = False) -> datetime:
    """
    Parse 'YYYY-MM-DD' as UTC midnight. If end_of_day=True, return start of the *next* day
    so you can use range [start, end) (end exclusive).
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
      - revenue: net revenue (charges - refunds) within [date_from, date_to]
    Date range defaults to the last 7 days if omitted.
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
        # if you have a rentals collection
        active_rentals = await db["rentals"].count_documents(
            {"status": {"$in": ["in_use", "rented"]}}
        )
    except Exception:
        # if rentals collection doesn't exist, fall back to umbrellas
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

    # --- Revenue (charges - refunds) within [start, end) ---
    # We support flexible schemas:
    #   - payments: { amount_lkr: number, type: 'charge'|'refund', status: 'paid'|'captured'|'refunded', created_at: datetime }
    #   - or amount_lkr negative for refunds
    revenue = 0
    try:
        match = {
            "created_at": {"$gte": start, "$lt": end},
            # consider only succeeded/paid states if you have them; this is optional
            # "status": {"$in": ["paid", "captured", "succeeded", "refunded"]},
        }

        pipeline = [
            {"$match": match},
            {"$group": {
                "_id": None,
                "total": {"$sum": {
                    "$cond": [
                        { "$or": [
                            { "$in": ["$type", ["refund", "chargeback", "payout"]] },
                            { "$eq": ["$direction", "out"] },
                            { "$lt": ["$amount_lkr", 0] }
                        ]},
                        { "$multiply": ["$amount_lkr", -1] },
                        "$amount_lkr"
                    ]}
                }
            }},
        ]

        agg = db["payments"].aggregate(pipeline)
        doc = await agg.to_list(length=1)
        if doc:
            revenue = float(doc[0].get("total") or 0)
        else:
            revenue = 0.0
    except Exception:
        revenue = 0.0

    return {
        "active_rentals": int(active_rentals),
        "umbrellas_available": int(umbrellas_available),
        "revenue": round(revenue, 2),
        "date_from": start.isoformat() + "Z",
        "date_to":   (end - timedelta(milliseconds=1)).isoformat() + "Z",
    }
