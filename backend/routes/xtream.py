"""Server-side Xtream Codes proxy.

All Xtream API calls go through these endpoints so the frontend never
sees the server URL, username or password. We also proxy the actual
stream bytes for stable playback on cross-origin restricted clients.
"""
from datetime import datetime, timezone
from typing import Optional, Any, Dict, List
import asyncio
import logging

from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import StreamingResponse
import httpx

from core.db import get_db
from core.auth_deps import require_user
from routes.admin import _read_decrypted_xtream

logger = logging.getLogger("xtream")
router = APIRouter(prefix="/api/xtream", tags=["xtream"])


# ── simple in-memory TTL cache for API payloads ───────────────────────
# Keeps response times snappy and keeps load off the Xtream server.
class _TTLCache:
    def __init__(self, ttl_seconds: int = 300):
        self.ttl = ttl_seconds
        self._data: Dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._data.get(key)
        if not entry:
            return None
        ts, value = entry
        now = asyncio.get_event_loop().time() if asyncio.get_event_loop().is_running() else 0
        # fallback to time.time if loop not running
        import time
        now = time.time()
        if now - ts > self.ttl:
            self._data.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        import time
        self._data[key] = (time.time(), value)

    def clear(self) -> None:
        self._data.clear()


_CACHE = _TTLCache(ttl_seconds=600)      # 10 min for category/list data


# ── helper: build a player_api.php URL for an action ─────────────────────
async def _xtream_api(action: Optional[str] = None, **extra) -> Any:
    cfg = await _read_decrypted_xtream()
    if not cfg:
        raise HTTPException(status_code=503, detail="Xtream server not configured")

    params: Dict[str, str] = {
        "username": cfg["username"],
        "password": cfg["password"],
    }
    if action:
        params["action"] = action
    for k, v in extra.items():
        if v is not None:
            params[k] = str(v)

    url = f"{cfg['server_url']}/player_api.php"
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            r = await client.get(url, params=params)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Upstream Xtream error: {e}")

    if r.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Upstream Xtream returned HTTP {r.status_code}",
        )
    try:
        return r.json()
    except Exception:
        # Some servers return empty body for invalid auth
        raise HTTPException(status_code=502, detail="Upstream returned non-JSON")


# ── admin-facing: test + sync counts ──────────────────────────────
from core.auth_deps import require_admin

@router.post("/admin/sync")
async def sync_counts(_: str = Depends(require_admin)):
    """Admin-only: pings Xtream for auth info and refreshes counters."""
    _CACHE.clear()
    try:
        auth = await _xtream_api(None)              # no action = auth info
        live = await _xtream_api("get_live_streams")
        vod  = await _xtream_api("get_vod_streams")
        series = await _xtream_api("get_series")
    except HTTPException as e:
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        await db.xtream_config.update_one(
            {"_id": "xtream"},
            {"$set": {
                "last_sync_status": f"error: {e.detail}",
                "last_sync_at": now,
            }},
        )
        raise

    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    live_count = len(live) if isinstance(live, list) else 0
    vod_count = len(vod) if isinstance(vod, list) else 0
    series_count = len(series) if isinstance(series, list) else 0
    await db.xtream_config.update_one(
        {"_id": "xtream"},
        {"$set": {
            "last_sync_status": "ok",
            "last_sync_at": now,
            "live_count": live_count,
            "vod_count": vod_count,
            "series_count": series_count,
            "auth_info": auth.get("user_info") if isinstance(auth, dict) else None,
        }},
    )
    return {
        "ok": True,
        "live_count": live_count,
        "vod_count": vod_count,
        "series_count": series_count,
        "synced_at": now,
    }


# ── user-facing data ────────────────────────────────────────────────
# Note: response shapes are the raw Xtream payload so the frontend data
# layer stays simple (same shape it expected from the old Supabase
# proxy). We just hide the creds.

@router.get("/live/categories")
async def live_categories(_: str = Depends(require_user)):
    key = "live_cats"
    cached = _CACHE.get(key)
    if cached is not None:
        return cached
    data = await _xtream_api("get_live_categories")
    _CACHE.set(key, data)
    return data


@router.get("/live/channels")
async def live_channels(category_id: Optional[str] = None, _: str = Depends(require_user)):
    key = f"live_streams:{category_id or 'all'}"
    cached = _CACHE.get(key)
    if cached is not None:
        return cached
    data = await _xtream_api("get_live_streams", category_id=category_id)
    _CACHE.set(key, data)
    return data


@router.get("/vod/categories")
async def vod_categories(_: str = Depends(require_user)):
    key = "vod_cats"
    cached = _CACHE.get(key)
    if cached is not None:
        return cached
    data = await _xtream_api("get_vod_categories")
    _CACHE.set(key, data)
    return data


@router.get("/vod/movies")
async def vod_movies(category_id: Optional[str] = None, _: str = Depends(require_user)):
    key = f"vod_streams:{category_id or 'all'}"
    cached = _CACHE.get(key)
    if cached is not None:
        return cached
    data = await _xtream_api("get_vod_streams", category_id=category_id)
    _CACHE.set(key, data)
    return data


@router.get("/vod/info/{vod_id}")
async def vod_info(vod_id: str, _: str = Depends(require_user)):
    return await _xtream_api("get_vod_info", vod_id=vod_id)


@router.get("/series/categories")
async def series_categories(_: str = Depends(require_user)):
    key = "series_cats"
    cached = _CACHE.get(key)
    if cached is not None:
        return cached
    data = await _xtream_api("get_series_categories")
    _CACHE.set(key, data)
    return data


@router.get("/series/list")
async def series_list(category_id: Optional[str] = None, _: str = Depends(require_user)):
    key = f"series_list:{category_id or 'all'}"
    cached = _CACHE.get(key)
    if cached is not None:
        return cached
    data = await _xtream_api("get_series", category_id=category_id)
    _CACHE.set(key, data)
    return data


@router.get("/series/info/{series_id}")
async def series_info(series_id: str, _: str = Depends(require_user)):
    return await _xtream_api("get_series_info", series_id=series_id)


@router.get("/epg/short")
async def epg_short(stream_id: str, limit: int = 4, _: str = Depends(require_user)):
    return await _xtream_api("get_short_epg", stream_id=stream_id, limit=limit)


# ── stream proxying ────────────────────────────────────────────────
# Returns a signed URL back to the FRONTEND that points to our own
# `/api/xtream/stream/...` endpoints. The frontend therefore never
# embeds the real Xtream server in any <video> or HLS manifest.

class _StreamUrlOut(dict):
    pass

@router.get("/stream/live/{channel_id}.m3u8")
@router.get("/stream/live/{channel_id}.ts")
async def stream_live(channel_id: str, request: Request, _: str = Depends(require_user)):
    return await _proxy_stream(request, "live", channel_id)


@router.get("/stream/movie/{movie_id}.{ext}")
async def stream_movie(movie_id: str, ext: str, request: Request, _: str = Depends(require_user)):
    return await _proxy_stream(request, "movie", f"{movie_id}.{ext}")


@router.get("/stream/series/{episode_id}.{ext}")
async def stream_series(episode_id: str, ext: str, request: Request, _: str = Depends(require_user)):
    return await _proxy_stream(request, "series", f"{episode_id}.{ext}")


async def _proxy_stream(request: Request, kind: str, tail: str) -> StreamingResponse:
    cfg = await _read_decrypted_xtream()
    if not cfg:
        raise HTTPException(status_code=503, detail="Xtream server not configured")

    # Build upstream URL. Xtream live path ends with /{stream_id} or
    # /{stream_id}.m3u8 / .ts depending on the kind.
    # movie / series paths always have the file extension appended.
    if kind == "live":
        upstream = f"{cfg['server_url']}/live/{cfg['username']}/{cfg['password']}/{tail}"
    elif kind == "movie":
        upstream = f"{cfg['server_url']}/movie/{cfg['username']}/{cfg['password']}/{tail}"
    elif kind == "series":
        upstream = f"{cfg['server_url']}/series/{cfg['username']}/{cfg['password']}/{tail}"
    else:
        raise HTTPException(status_code=400, detail="invalid kind")

    # Forward Range header for seeking / resumes.
    headers = {}
    rng = request.headers.get("range")
    if rng:
        headers["Range"] = rng
    headers["User-Agent"] = "NadiBox/2.0 (FastAPI proxy)"

    client = httpx.AsyncClient(timeout=None, follow_redirects=True)
    try:
        upstream_resp = await client.send(
            client.build_request("GET", upstream, headers=headers),
            stream=True,
        )
    except httpx.HTTPError as e:
        await client.aclose()
        raise HTTPException(status_code=502, detail=f"Upstream stream error: {e}")

    # Forward only safe headers — never leak server URL via Location etc.
    forward_headers = {}
    for h in ("content-type", "content-length", "accept-ranges", "content-range", "cache-control"):
        v = upstream_resp.headers.get(h)
        if v:
            forward_headers[h] = v
    forward_headers["access-control-allow-origin"] = "*"

    async def iterator():
        try:
            async for chunk in upstream_resp.aiter_raw():
                yield chunk
        finally:
            await upstream_resp.aclose()
            await client.aclose()

    return StreamingResponse(
        iterator(),
        status_code=upstream_resp.status_code,
        headers=forward_headers,
    )
