"""Public (authenticated-user) endpoints for subscription info & xtream resolution."""
from fastapi import APIRouter, HTTPException, Request

from core.auth import get_current_user
from routes.admin_users import _get_settings_doc
from routes.auth import _shape_user, get_db

router = APIRouter(prefix="/api/subscription", tags=["subscription"])


@router.get("/status")
async def status(request: Request):
    """Returns subscription + xtream info for the logged-in user.

    - Admins get a summary only (they manage, don't watch through this flow).
    - Regular users get days_remaining, is_expired, and resolved xtream creds
      (unless expired — in which case creds are blanked and whatsapp_number is provided).
    """
    user = await get_current_user(request)
    db = get_db()
    shaped = _shape_user(await db.users.find_one({"id": user["id"]}, {"_id": 0}))
    settings = await _get_settings_doc(db)

    resolved_xtream = {"server": "", "username": "", "password": ""}
    if shaped.get("role") == "user":
        mode = shaped.get("xtream_mode", "shared")
        if mode == "own":
            resolved_xtream = {
                "server": shaped.get("xtream_server", ""),
                "username": shaped.get("xtream_username", ""),
                "password": shaped.get("xtream_password", ""),
            }
        else:
            resolved_xtream = {
                "server": settings.get("shared_xtream_server", ""),
                "username": settings.get("shared_xtream_username", ""),
                "password": settings.get("shared_xtream_password", ""),
            }

    if shaped.get("is_expired"):
        resolved_xtream = {"server": "", "username": "", "password": ""}

    return {
        "user": shaped,
        "xtream": resolved_xtream,
        "whatsapp_number": settings.get("whatsapp_number", ""),
    }
