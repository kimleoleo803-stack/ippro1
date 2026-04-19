"""Admin endpoints — login, seed, Xtream config CRUD, user CRUD.

Only ONE admin account exists, seeded on first boot from
ADMIN_EMAIL / ADMIN_PASSWORD env vars.
"""
from datetime import datetime, timezone
from typing import Optional, List
import os
import uuid

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, EmailStr

from core.db import get_db
from core.security import (
    hash_password, verify_password,
    make_token, ADMIN_TOKEN_TTL_HOURS,
    encrypt_str, decrypt_str,
)
from core.auth_deps import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Models ─────────────────────────────────────────────────────────
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class LoginOut(BaseModel):
    token: str
    email: str

class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str

class XtreamConfigIn(BaseModel):
    server_url: str = Field(..., min_length=4)
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

class XtreamConfigOut(BaseModel):
    server_url: str
    username: str
    password_masked: str          # e.g. "••••••"
    updated_at: Optional[str] = None
    last_sync_status: Optional[str] = None
    last_sync_at: Optional[str] = None
    live_count: Optional[int] = None
    vod_count: Optional[int] = None
    series_count: Optional[int] = None

class UserIn(BaseModel):
    username: str = Field(..., min_length=2, max_length=64)
    password: str = Field(..., min_length=4)
    expires_at: Optional[str] = None
    enabled: bool = True

class UserUpdateIn(BaseModel):
    password: Optional[str] = None
    expires_at: Optional[str] = None
    enabled: Optional[bool] = None

class UserOut(BaseModel):
    id: str
    username: str
    enabled: bool
    expires_at: Optional[str] = None
    created_at: Optional[str] = None


# ── Seed helpers ───────────────────────────────────────────────────
async def seed_admin_if_missing() -> None:
    """Called once at app startup. Creates the single admin row if it
    doesn't exist yet. Safe to call repeatedly — it's a no-op when an
    admin already exists."""
    db = get_db()
    existing = await db.admins.find_one({})
    if existing:
        return
    email = os.environ.get("ADMIN_EMAIL", "admin@nadibox.local")
    pw = os.environ.get("ADMIN_PASSWORD", "ChangeMe123!")
    now = datetime.now(timezone.utc).isoformat()
    await db.admins.insert_one({
        "_id": "admin",              # single admin — stable id
        "email": email.lower(),
        "password_hash": hash_password(pw),
        "created_at": now,
        "updated_at": now,
    })


# ── Routes: auth ───────────────────────────────────────────────────
@router.post("/login", response_model=LoginOut)
async def admin_login(body: LoginIn):
    db = get_db()
    row = await db.admins.find_one({"email": body.email.lower()})
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = make_token(row["email"], "admin", ADMIN_TOKEN_TTL_HOURS)
    return LoginOut(token=token, email=row["email"])


@router.get("/me")
async def admin_me(email: str = Depends(require_admin)):
    return {"email": email, "role": "admin"}


@router.post("/change-password")
async def admin_change_password(body: ChangePasswordIn, email: str = Depends(require_admin)):
    db = get_db()
    row = await db.admins.find_one({"email": email})
    if not row or not verify_password(body.current_password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is wrong")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 chars")
    await db.admins.update_one(
        {"_id": row["_id"]},
        {"$set": {
            "password_hash": hash_password(body.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"ok": True}


# ── Routes: Xtream config (single row) ─────────────────────────────
async def _load_xtream_row(db) -> Optional[dict]:
    return await db.xtream_config.find_one({"_id": "xtream"})

@router.get("/xtream", response_model=Optional[XtreamConfigOut])
async def get_xtream_config(_: str = Depends(require_admin)):
    db = get_db()
    row = await _load_xtream_row(db)
    if not row:
        return None
    return XtreamConfigOut(
        server_url=row.get("server_url", ""),
        username=row.get("username", ""),
        password_masked="•" * 8,
        updated_at=row.get("updated_at"),
        last_sync_status=row.get("last_sync_status"),
        last_sync_at=row.get("last_sync_at"),
        live_count=row.get("live_count"),
        vod_count=row.get("vod_count"),
        series_count=row.get("series_count"),
    )


@router.post("/xtream", response_model=XtreamConfigOut)
async def set_xtream_config(body: XtreamConfigIn, _: str = Depends(require_admin)):
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    server_url = body.server_url.rstrip("/")
    doc = {
        "_id": "xtream",
        "server_url": server_url,
        "username": body.username,
        # store password encrypted — NEVER return it
        "password_enc": encrypt_str(body.password),
        "updated_at": now,
        "last_sync_status": None,
        "last_sync_at": None,
    }
    await db.xtream_config.replace_one({"_id": "xtream"}, doc, upsert=True)
    return XtreamConfigOut(
        server_url=server_url,
        username=body.username,
        password_masked="•" * 8,
        updated_at=now,
    )


@router.delete("/xtream")
async def delete_xtream_config(_: str = Depends(require_admin)):
    db = get_db()
    await db.xtream_config.delete_one({"_id": "xtream"})
    return {"ok": True}


async def _read_decrypted_xtream() -> Optional[dict]:
    """Internal helper — returns dict with plaintext credentials or None."""
    db = get_db()
    row = await _load_xtream_row(db)
    if not row:
        return None
    pw = decrypt_str(row.get("password_enc"))
    if pw is None:
        return None
    return {
        "server_url": row["server_url"],
        "username": row["username"],
        "password": pw,
    }


# ── Routes: user CRUD ──────────────────────────────────────────────
@router.get("/users", response_model=List[UserOut])
async def list_users(_: str = Depends(require_admin)):
    db = get_db()
    cursor = db.users.find({}, {"password_hash": 0}).sort("created_at", -1)
    out: List[UserOut] = []
    async for row in cursor:
        out.append(UserOut(
            id=row.get("id") or row.get("_id"),
            username=row["username"],
            enabled=row.get("enabled", True),
            expires_at=row.get("expires_at"),
            created_at=row.get("created_at"),
        ))
    return out


@router.post("/users", response_model=UserOut)
async def create_user(body: UserIn, _: str = Depends(require_admin)):
    db = get_db()
    uname = body.username.strip().lower()
    if await db.users.find_one({"username": uname}):
        raise HTTPException(status_code=409, detail="Username already exists")
    uid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": uid,
        "username": uname,
        "password_hash": hash_password(body.password),
        "enabled": body.enabled,
        "expires_at": body.expires_at,
        "created_at": now,
    }
    await db.users.insert_one(doc)
    return UserOut(
        id=uid, username=uname, enabled=body.enabled,
        expires_at=body.expires_at, created_at=now,
    )


@router.patch("/users/{uid}", response_model=UserOut)
async def update_user(uid: str, body: UserUpdateIn, _: str = Depends(require_admin)):
    db = get_db()
    row = await db.users.find_one({"id": uid})
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    patch: dict = {}
    if body.password is not None:
        if len(body.password) < 4:
            raise HTTPException(status_code=400, detail="Password too short")
        patch["password_hash"] = hash_password(body.password)
    if body.enabled is not None:
        patch["enabled"] = body.enabled
    if body.expires_at is not None:
        patch["expires_at"] = body.expires_at
    if patch:
        await db.users.update_one({"id": uid}, {"$set": patch})
        row = await db.users.find_one({"id": uid})
    return UserOut(
        id=row["id"], username=row["username"], enabled=row.get("enabled", True),
        expires_at=row.get("expires_at"), created_at=row.get("created_at"),
    )


@router.delete("/users/{uid}")
async def delete_user(uid: str, _: str = Depends(require_admin)):
    db = get_db()
    result = await db.users.delete_one({"id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}
