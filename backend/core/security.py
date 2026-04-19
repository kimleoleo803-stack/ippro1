"""Password hashing, JWT encoding/decoding, and symmetric encryption
for sensitive Xtream credentials stored in MongoDB.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import os

import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet, InvalidToken

# ── password hashing ───────────────────────────────────────────────
_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return _pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _pwd_ctx.verify(plain, hashed)
    except Exception:
        return False

# ── JWT helpers ────────────────────────────────────────────────────
def _secret() -> str:
    s = os.environ.get("JWT_SECRET")
    if not s:
        raise RuntimeError("JWT_SECRET env var is not set")
    return s

DEFAULT_ALGO = "HS256"
USER_TOKEN_TTL_HOURS = 24 * 7       # 7 days for NADIBOX user
ADMIN_TOKEN_TTL_HOURS = 12          # shorter for admin

def make_token(subject: str, role: str, ttl_hours: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=ttl_hours)).timestamp()),
    }
    return jwt.encode(payload, _secret(), algorithm=DEFAULT_ALGO)

def decode_token(token: str) -> Dict[str, Any]:
    """Raises jwt.PyJWTError on any problem."""
    return jwt.decode(token, _secret(), algorithms=[DEFAULT_ALGO])

# ── Fernet encryption for Xtream creds at rest ─────────────────────
def _fernet() -> Fernet:
    k = os.environ.get("FERNET_KEY")
    if not k:
        raise RuntimeError("FERNET_KEY env var is not set")
    return Fernet(k.encode() if isinstance(k, str) else k)

def encrypt_str(plain: Optional[str]) -> Optional[str]:
    if plain is None:
        return None
    return _fernet().encrypt(plain.encode()).decode()

def decrypt_str(token: Optional[str]) -> Optional[str]:
    if not token:
        return None
    try:
        return _fernet().decrypt(token.encode()).decode()
    except (InvalidToken, ValueError):
        return None
