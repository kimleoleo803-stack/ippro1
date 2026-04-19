"""Dashboard / counters.  Public (no auth) — returns counts only, no
credentials or server URL.
"""
from fastapi import APIRouter, Depends
from core.db import get_db
from core.auth_deps import require_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/counts")
async def counts(_: str = Depends(require_user)):
    """Return the cached content counts for the home screen tiles.
    Only authenticated NADIBOX users can fetch — prevents scraping.
    """
    db = get_db()
    row = await db.xtream_config.find_one({"_id": "xtream"}, {"_id": 0})
    if not row:
        return {"live": 0, "movies": 0, "series": 0, "configured": False}
    return {
        "live": row.get("live_count", 0) or 0,
        "movies": row.get("vod_count", 0) or 0,
        "series": row.get("series_count", 0) or 0,
        "configured": True,
        "last_sync_at": row.get("last_sync_at"),
    }
