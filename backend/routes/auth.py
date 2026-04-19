"""Auth routes: login, me, logout (stateless)."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from core.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_db = None


def set_db(db):
    global _db
    _db = db


def get_db():
    return _db


class LoginIn(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


def _days_remaining(expiry_iso: Optional[str]) -> Optional[int]:
    if not expiry_iso:
        return None
    try:
        dt = datetime.fromisoformat(expiry_iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        delta = dt - datetime.now(timezone.utc)
        # round up if there's any positive remainder in the current day
        total_seconds = int(delta.total_seconds())
        if total_seconds <= 0:
            return 0
        return max(1, (total_seconds + 86399) // 86400)
    except Exception:
        return None


def _shape_user(user: dict) -> dict:
    """Add computed fields, drop sensitive fields."""
    data = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    data["days_remaining"] = _days_remaining(user.get("expiry_at"))
    data["is_expired"] = (
        data["days_remaining"] == 0 if data["days_remaining"] is not None else False
    )
    return data


@router.post("/login")
async def login(body: LoginIn):
    db = get_db()
    username = body.username.strip().lower()
    user = await db.users.find_one({"username": username})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(user["id"], user["username"], user["role"])
    return {"access_token": token, "token_type": "bearer", "user": _shape_user(user)}


@router.get("/me")
async def me(request: Request):
    user = await get_current_user(request)
    # Re-fetch expiry for freshness (it might have been updated by admin)
    db = get_db()
    full = await db.users.find_one({"id": user["id"]})
    if not full:
        raise HTTPException(status_code=401, detail="User not found")
    return _shape_user(full)


# Export helper for admin route reuse
__all__ = ["router", "set_db", "get_db", "_shape_user", "_days_remaining", "hash_password"]
