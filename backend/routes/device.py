"""
Device Pairing API — IBO Player Pro style.

Flow:
1. Device calls POST /api/device/register → gets a pseudo-MAC, device_id, 6-digit PIN
2. Device polls GET /api/device/status/{device_id} until paired == true
3. User opens the web portal at /pair, enters the PIN + their Xtream credentials
4. Portal calls POST /api/device/pair with { pin, server_url, username, password }
5. Device's next poll sees paired=true, calls GET /api/device/config/{device_id}
   to fetch the linked Xtream credentials.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import secrets
import hashlib
import os

router = APIRouter(prefix="/api/device", tags=["device-pairing"])

# Will be set from server.py
db = None

def set_db(database):
    global db
    db = database


# ── Models ──────────────────────────────────────────────────────────

class DeviceRegisterResponse(BaseModel):
    device_id: str
    mac_address: str
    pin: str
    created_at: str

class DeviceStatusResponse(BaseModel):
    device_id: str
    mac_address: str
    paired: bool
    profile_name: Optional[str] = None

class PairRequest(BaseModel):
    pin: str
    server_url: str
    username: str
    password: str
    profile_name: str = "Paired Device"

class PairResponse(BaseModel):
    success: bool
    device_id: str
    message: str

class DeviceConfigResponse(BaseModel):
    device_id: str
    mac_address: str
    server_url: str
    username: str
    password: str
    profile_name: str
    paired_at: str


# ── Helpers ─────────────────────────────────────────────────────────

def generate_pseudo_mac() -> str:
    """Generate a pseudo-MAC address (XX:XX:XX:XX:XX:XX) since real MACs
    are blocked on Android 6+."""
    octets = [secrets.randbelow(256) for _ in range(6)]
    # Set locally-administered bit
    octets[0] = (octets[0] | 0x02) & 0xFE
    return ":".join(f"{b:02X}" for b in octets)

def generate_pin() -> str:
    """6-digit numeric PIN."""
    return f"{secrets.randbelow(1000000):06d}"

def generate_device_id() -> str:
    """Short unique device identifier."""
    return secrets.token_hex(8).upper()


# ── Routes ──────────────────────────────────────────────────────────

@router.post("/register", response_model=DeviceRegisterResponse)
async def register_device():
    """Called by the TV/device app on first launch. Creates a new
    device record with a pseudo-MAC, device_id, and 6-digit PIN."""
    device_id = generate_device_id()
    mac_address = generate_pseudo_mac()
    pin = generate_pin()
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "device_id": device_id,
        "mac_address": mac_address,
        "pin": pin,
        "paired": False,
        "server_url": None,
        "username": None,
        "password": None,
        "profile_name": None,
        "created_at": now,
        "paired_at": None,
    }
    await db.devices.insert_one(doc)

    return DeviceRegisterResponse(
        device_id=device_id,
        mac_address=mac_address,
        pin=pin,
        created_at=now,
    )


@router.get("/status/{device_id}", response_model=DeviceStatusResponse)
async def device_status(device_id: str):
    """Polling endpoint — device checks if it's been paired yet."""
    doc = await db.devices.find_one(
        {"device_id": device_id},
        {"_id": 0, "device_id": 1, "mac_address": 1, "paired": 1, "profile_name": 1}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Device not found")
    return DeviceStatusResponse(**doc)


@router.post("/pair", response_model=PairResponse)
async def pair_device(req: PairRequest):
    """Called from the web portal. Links Xtream credentials to the
    device identified by the 6-digit PIN."""
    pin = req.pin.strip()
    if len(pin) != 6 or not pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be 6 digits")

    doc = await db.devices.find_one(
        {"pin": pin, "paired": False},
        {"_id": 0, "device_id": 1}
    )
    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Invalid PIN or device already paired"
        )

    now = datetime.now(timezone.utc).isoformat()
    await db.devices.update_one(
        {"device_id": doc["device_id"]},
        {"$set": {
            "paired": True,
            "server_url": req.server_url,
            "username": req.username,
            "password": req.password,
            "profile_name": req.profile_name,
            "paired_at": now,
        }}
    )

    return PairResponse(
        success=True,
        device_id=doc["device_id"],
        message="Device paired successfully"
    )


@router.get("/config/{device_id}", response_model=DeviceConfigResponse)
async def device_config(device_id: str):
    """Device fetches its linked Xtream credentials after pairing."""
    doc = await db.devices.find_one(
        {"device_id": device_id, "paired": True},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Device not found or not yet paired"
        )

    return DeviceConfigResponse(
        device_id=doc["device_id"],
        mac_address=doc["mac_address"],
        server_url=doc["server_url"],
        username=doc["username"],
        password=doc["password"],
        profile_name=doc["profile_name"],
        paired_at=doc.get("paired_at", ""),
    )


@router.delete("/unpair/{device_id}")
async def unpair_device(device_id: str):
    """Reset a device — clears credentials so it can be re-paired."""
    result = await db.devices.update_one(
        {"device_id": device_id},
        {"$set": {
            "paired": False,
            "server_url": None,
            "username": None,
            "password": None,
            "profile_name": None,
            "paired_at": None,
            "pin": generate_pin(),  # new PIN for re-pairing
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    
    updated = await db.devices.find_one(
        {"device_id": device_id},
        {"_id": 0, "device_id": 1, "pin": 1}
    )
    return {"success": True, "device_id": device_id, "new_pin": updated["pin"]}
