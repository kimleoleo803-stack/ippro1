"""GeoIP + weather proxy, cached.

Uses the two free, no-key services chosen by the user:
  • ip-api.com/json   → city, country, lat, lon
  • open-meteo.com    → current temperature C from (lat, lon)
"""
import time
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Request
import httpx

router = APIRouter(prefix="/api/geo", tags=["geo-weather"])

_CACHE: Dict[str, tuple[float, Any]] = {}
_CACHE_TTL_GEO = 60 * 60 * 12        # 12 hours — IP->city rarely changes
_CACHE_TTL_WEATHER = 60 * 15         # 15 min refresh


def _cache_get(key: str, ttl: int) -> Optional[Any]:
    entry = _CACHE.get(key)
    if not entry:
        return None
    ts, value = entry
    if time.time() - ts > ttl:
        _CACHE.pop(key, None)
        return None
    return value


def _cache_set(key: str, value: Any) -> None:
    _CACHE[key] = (time.time(), value)


def _client_ip(request: Request) -> Optional[str]:
    # Behind K8s/Cloudflare ingress the user IP is in x-forwarded-for
    xff = request.headers.get("x-forwarded-for")
    if xff:
        # First entry = client
        return xff.split(",")[0].strip()
    xr = request.headers.get("x-real-ip")
    if xr:
        return xr.strip()
    return request.client.host if request.client else None


async def _fetch_geo(ip: Optional[str]) -> Dict[str, Any]:
    key = f"geo:{ip or 'self'}"
    cached = _cache_get(key, _CACHE_TTL_GEO)
    if cached is not None:
        return cached
    url = f"http://ip-api.com/json/{ip}" if ip else "http://ip-api.com/json/"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.get(url, params={"fields": "status,country,countryCode,city,lat,lon,timezone,query"})
            data = r.json() if r.status_code == 200 else {}
    except Exception:
        data = {}

    if data.get("status") != "success":
        # graceful fallback — don't blow up the widget
        data = {
            "city": "Unknown",
            "country": "",
            "countryCode": "",
            "lat": None,
            "lon": None,
            "timezone": "UTC",
        }
    _cache_set(key, data)
    return data


async def _fetch_weather(lat: float, lon: float) -> Dict[str, Any]:
    key = f"weather:{round(lat,2)}:{round(lon,2)}"
    cached = _cache_get(key, _CACHE_TTL_WEATHER)
    if cached is not None:
        return cached
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,weather_code",
                    "timezone": "auto",
                },
            )
            data = r.json() if r.status_code == 200 else {}
    except Exception:
        data = {}

    cur = data.get("current") or {}
    result = {
        "temperature_c": cur.get("temperature_2m"),
        "weather_code": cur.get("weather_code"),
        "timezone": data.get("timezone", "UTC"),
    }
    _cache_set(key, result)
    return result


@router.get("/me")
async def geo_me(request: Request):
    """Returns city + weather for the caller. Public endpoint — safe to
    call from the login screen / splash."""
    ip = _client_ip(request)
    geo = await _fetch_geo(ip)
    weather: Dict[str, Any] = {}
    if geo.get("lat") is not None and geo.get("lon") is not None:
        try:
            weather = await _fetch_weather(geo["lat"], geo["lon"])
        except Exception:
            weather = {}
    return {
        "ip": ip,
        "city": geo.get("city", ""),
        "country": geo.get("country", ""),
        "country_code": geo.get("countryCode", ""),
        "timezone": geo.get("timezone") or weather.get("timezone") or "UTC",
        "temperature_c": weather.get("temperature_c"),
        "weather_code": weather.get("weather_code"),
    }
