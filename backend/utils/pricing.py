# backend/utils/simple_pricing.py
from datetime import datetime, timezone
from typing import Dict

GLOBAL_BASE_LKR = 200.0 

def _round_to(n: float, step: int = 10) -> float:
    return float(int(round(n / step)) * step)

def compute_simple_price(weather: Dict[str, float], now: datetime | None = None) -> Dict:
    """
    Deterministic, lightweight, Sri Lanka-friendly umbrella pricing.

    Rules:
    - Start from a global base price (LKR).
    - Bump up for rain probability bands and rain mm.
    - Gentle peak-hour bump (7–9, 16–19).
    - Slight discount if very windy (>= 45 km/h).
    - Clamp, then round to nearest 10 LKR.
    """
    now = now or datetime.now(timezone.utc)

    base = GLOBAL_BASE_LKR
    pp   = weather.get("precip_prob", 0.0)  # %
    mm   = weather.get("precip_mm", 0.0)    # mm
    wind = weather.get("wind_kmh", 0.0)     # km/h

    m = 1.0  # multiplier
    reasons = {}

    # Rain probability (choose ONE band)
    if pp >= 80:
        m *= 1.30; reasons["pp>=80%"] = +0.30
    elif pp >= 60:
        m *= 1.20; reasons["pp>=60%"] = +0.20
    elif pp >= 40:
        m *= 1.10; reasons["pp>=40%"] = +0.10
    # <40% -> no change

    # Actual rain amount (stack with probability)
    if mm >= 5:
        m *= 1.20; reasons["rain>=5mm"] = +0.20
    elif mm >= 2:
        m *= 1.10; reasons["rain>=2mm"] = +0.10

    # Peak commuter times (gentle)
    local_hour = now.astimezone().hour  # assumes server TZ close enough; fine for rule of thumb
    if 7 <= local_hour <= 9 or 16 <= local_hour <= 19:
        m *= 1.05; reasons["peak_hours"] = +0.05

    # High wind → slight discount (umbrellas less desirable)
    if wind >= 45:
        m *= 0.95; reasons["wind>=45kmh"] = -0.05

    # Clamp & round
    if m < 0.7: m = 0.7
    if m > 1.6: m = 1.6
    raw = base * m
    final_lkr = _round_to(raw, 10)

    return {
        "currency": "LKR",
        "base_price": base,
        "multiplier": round(m, 2),
        "final_price": final_lkr,
        "reasons": reasons,
    }
