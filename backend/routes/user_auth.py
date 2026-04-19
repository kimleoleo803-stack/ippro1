"""NADIBOX user auth — username + password login.
Users are created only by the admin.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from core.db import get_db
from core.security import verify_password, make_token, USER_TOKEN_TTL_HOURS
from core.auth_deps import require_user

router = APIRouter(prefix="/api/user", tags=["user-auth"])


class LoginIn(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

class LoginOut(BaseModel):
    token: str
    username: str


@router.post("/login", response_model=LoginOut)
async def user_login(body: LoginIn):
    db = get_db()
    uname = body.username.strip().lower()
    row = await db.users.find_one({"username": uname})
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not row.get("enabled", True):
        raise HTTPException(status_code=403, detail="Account disabled")
    exp = row.get("expires_at")
    if exp:
        try:
            if datetime.fromisoformat(exp.replace("Z", "+00:00")) < datetime.now(timezone.utc):
                raise HTTPException(status_code=403, detail="Account expired")
        except ValueError:
            pass
    token = make_token(uname, "user", USER_TOKEN_TTL_HOURS)
    return LoginOut(token=token, username=uname)


@router.get("/me")
async def user_me(username: str = Depends(require_user)):
    return {"username": username, "role": "user"}
