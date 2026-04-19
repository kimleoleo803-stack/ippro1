"""Public (unauthenticated) endpoints for guests."""
from fastapi import APIRouter

from routes.admin_users import _get_settings_doc
from routes.auth import get_db

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/shared-xtream")
async def shared_xtream():
    """Returns the admin-configured shared Xtream creds so Guest users
    can pick "Use shared server" and have their profile auto-filled.

    Note: this intentionally exposes the shared creds. If you want to
    restrict it, add a secret/token check here.
    """
    db = get_db()
    settings = await _get_settings_doc(db)
    return {
        "server": settings.get("shared_xtream_server", ""),
        "username": settings.get("shared_xtream_username", ""),
        "password": settings.get("shared_xtream_password", ""),
        "configured": bool(
            settings.get("shared_xtream_server")
            and settings.get("shared_xtream_username")
            and settings.get("shared_xtream_password")
        ),
    }
