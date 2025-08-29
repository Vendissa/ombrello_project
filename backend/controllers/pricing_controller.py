# backend/controllers/pricing_simple.py
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone, timedelta
from typing import Optional

from dependencies import get_db
from utils.sl_weather import get_sl_weather
from utils.pricing import compute_simple_price

router = APIRouter(prefix="/pricing", tags=["pricing"])

DEFAULT_LAT = 6.9271   # Colombo
DEFAULT_LNG = 79.8612

@router.get("/simple")
async def simple_price(
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
):
    """
    Returns the current LKR price for umbrella rental based on prevailing weather.
    If lat/lng omitted, defaults to Colombo.
    """
    vlat = lat if lat is not None else DEFAULT_LAT
    vlng = lng if lng is not None else DEFAULT_LNG

    weather = await get_sl_weather(vlat, vlng)
    calc = compute_simple_price(weather)

    # include small validity window for UI display (purely informational)
    valid_minutes = 10
    valid_until = datetime.now(timezone.utc) + timedelta(minutes=valid_minutes)

    return {
        "currency": calc["currency"],
        "lat": vlat,
        "lng": vlng,
        "weather": weather,
        "base_price": calc["base_price"],
        "multiplier": calc["multiplier"],
        "final_price": calc["final_price"],
        "valid_until": valid_until,
        "reasons": calc["reasons"],
    }
