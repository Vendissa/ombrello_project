import time, aiohttp
from typing import Dict, Tuple


_CACHE: Dict[Tuple[int,int], Tuple[float, Dict[str, float]]] = {}
TTL_SECONDS = 10 * 60  # 10 minutes

def _bucket(lat: float, lng: float) -> Tuple[int,int]:
    # ~1 km buckets in Sri Lanka; avoids hammering the API
    return (int(lat * 100), int(lng * 100))

async def get_sl_weather(lat: float, lng: float) -> Dict[str, float]:
    key = _bucket(lat, lng)
    now = time.time()
    if key in _CACHE and now - _CACHE[key][0] < TTL_SECONDS:
        return _CACHE[key][1]

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lng}"
        "&current=precipitation,precipitation_probability,wind_speed_10m"
        "&forecast_days=1"
    )
    async with aiohttp.ClientSession() as s:
        async with s.get(url, timeout=8) as r:
            r.raise_for_status()
            data = await r.json()

    cur = data.get("current") or {}
    out = {
        "precip_prob": float(cur.get("precipitation_probability", 0.0)),  # %
        "precip_mm":   float(cur.get("precipitation", 0.0)),              # mm
        "wind_kmh":    float(cur.get("wind_speed_10m", 0.0)),             # km/h
    }
    _CACHE[key] = (now, out)
    return out
