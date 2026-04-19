"""Admin routes: user CRUD + settings CRUD. Admin-only."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from core.auth import hash_password, require_admin
from routes.auth import _shape_user, get_db

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ---- User models ----
class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=40)
    password: str = Field(min_length=3, max_length=200)
    days: int = Field(default=30, ge=1, le=3650)
    xtream_mode: str = Field(default="shared", pattern="^(shared|own)$")
    xtream_server: Optional[str] = None
    xtream_username: Optional[str] = None
    xtream_password: Optional[str] = None
    note: Optional[str] = None


class UserUpdate(BaseModel):
    password: Optional[str] = Field(default=None, min_length=3, max_length=200)
    extend_days: Optional[int] = Field(default=None, ge=-3650, le=3650)
    set_expiry_at: Optional[str] = None  # ISO datetime
    xtream_mode: Optional[str] = Field(default=None, pattern="^(shared|own)$")
    xtream_server: Optional[str] = None
    xtream_username: Optional[str] = None
    xtream_password: Optional[str] = None
    note: Optional[str] = None


# ---- Settings models ----
class SettingsUpdate(BaseModel):
    whatsapp_number: Optional[str] = None
    shared_xtream_server: Optional[str] = None
    shared_xtream_username: Optional[str] = None
    shared_xtream_password: Optional[str] = None


SETTINGS_ID = "global"


async def _get_settings_doc(db) -> dict:
    doc = await db.settings.find_one({"id": SETTINGS_ID}, {"_id": 0})
    if not doc:
        doc = {
            "id": SETTINGS_ID,
            "whatsapp_number": "+1234567890",
            "shared_xtream_server": "",
            "shared_xtream_username": "",
            "shared_xtream_password": "",
        }
        await db.settings.insert_one(dict(doc))
    return doc


# ---- User endpoints ----
@router.get("/users")
async def list_users():
    db = get_db()
    users = await db.users.find({"role": "user"}, {"_id": 0}).to_list(1000)
    return [_shape_user(u) for u in users]


@router.post("/users")
async def create_user(body: UserCreate):
    db = get_db()
    username = body.username.strip().lower()
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=409, detail="Username already exists")
    now = datetime.now(timezone.utc)
    expiry = now + timedelta(days=body.days)
    doc = {
        "id": str(uuid.uuid4()),
        "username": username,
        "password_hash": hash_password(body.password),
        "role": "user",
        "created_at": now.isoformat(),
        "expiry_at": expiry.isoformat(),
        "xtream_mode": body.xtream_mode,
        "xtream_server": body.xtream_server or "",
        "xtream_username": body.xtream_username or "",
        "xtream_password": body.xtream_password or "",
        "note": body.note or "",
    }
    await db.users.insert_one(dict(doc))
    return _shape_user(doc)


@router.put("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdate):
    db = get_db()
    user = await db.users.find_one({"id": user_id, "role": "user"})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update = {}
    if body.password is not None:
        update["password_hash"] = hash_password(body.password)
    if body.set_expiry_at is not None:
        # Basic validation
        try:
            datetime.fromisoformat(body.set_expiry_at)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid set_expiry_at")
        update["expiry_at"] = body.set_expiry_at
    if body.extend_days is not None:
        base_iso = update.get("expiry_at", user.get("expiry_at"))
        try:
            base = datetime.fromisoformat(base_iso) if base_iso else datetime.now(timezone.utc)
        except Exception:
            base = datetime.now(timezone.utc)
        if base.tzinfo is None:
            base = base.replace(tzinfo=timezone.utc)
        # If already expired, extend from now
        if base < datetime.now(timezone.utc):
            base = datetime.now(timezone.utc)
        update["expiry_at"] = (base + timedelta(days=body.extend_days)).isoformat()
    for field in ("xtream_mode", "xtream_server", "xtream_username", "xtream_password", "note"):
        val = getattr(body, field)
        if val is not None:
            update[field] = val
    if update:
        await db.users.update_one({"id": user_id}, {"$set": update})
    fresh = await db.users.find_one({"id": user_id}, {"_id": 0})
    return _shape_user(fresh)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    db = get_db()
    res = await db.users.delete_one({"id": user_id, "role": "user"})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


# ---- Settings endpoints ----
@router.get("/settings")
async def get_settings():
    db = get_db()
    return await _get_settings_doc(db)


@router.put("/settings")
async def put_settings(body: SettingsUpdate):
    db = get_db()
    await _get_settings_doc(db)  # ensure exists
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.settings.update_one({"id": SETTINGS_ID}, {"$set": update})
    doc = await db.settings.find_one({"id": SETTINGS_ID}, {"_id": 0})
    return doc
