"""FastAPI auth dependencies — extract JWT from Authorization header,
validate role, and return the subject (admin email / user username).
"""
from typing import Literal
from fastapi import Header, HTTPException, status
import jwt as _jwt

from .security import decode_token


async def _extract_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    return authorization.split(" ", 1)[1].strip()


async def _decode_or_401(token: str) -> dict:
    try:
        return decode_token(token)
    except _jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except _jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(authorization: str | None = Header(None)) -> str:
    token = await _extract_token(authorization)
    payload = await _decode_or_401(token)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return payload["sub"]


async def require_user(authorization: str | None = Header(None)) -> str:
    token = await _extract_token(authorization)
    payload = await _decode_or_401(token)
    if payload.get("role") not in ("user", "admin"):
        raise HTTPException(status_code=403, detail="User role required")
    return payload["sub"]


async def require_any(authorization: str | None = Header(None)) -> tuple[str, Literal["user", "admin"]]:
    token = await _extract_token(authorization)
    payload = await _decode_or_401(token)
    role = payload.get("role")
    if role not in ("user", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    return payload["sub"], role
