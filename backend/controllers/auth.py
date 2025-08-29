# backend/controllers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta

from dependencies import get_db
from schemas.auth import SignupPayload, LoginPayload  # keep your existing schemas
from utils.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

from crud.user import (
    create_user,
    create_vendor,
    get_user_by_email,
    get_vendor_by_email,
)

router = APIRouter()


# ----------------- Local response/request models (no cookies) -----------------

class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

# ----------------- Helpers -----------------

def _normalize_status(doc: dict) -> Optional[str]:
    """
    Normalize a 'status' field to lower-case string, or None if missing/empty.
    """
    s = doc.get("status")
    if s is None:
        return None
    if isinstance(s, str):
        s = s.strip().lower()
        return s or None
    return None


# ----------------- Routes -----------------

@router.post("/signup", response_model=TokenPair)
async def signup(
    data: SignupPayload,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    # Password match
    if data.password != data.confirm_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Passwords do not match")

    # Role-specific existence check
    if data.role == "vendor":
        if await get_vendor_by_email(db, data.email):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")
    else:
        if await get_user_by_email(db, data.email):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")

    # Prepare document (hash once, insert once)
    doc = data.model_dump(exclude={"confirm_password"})
    doc["hashed_password"] = get_password_hash(data.password)
    doc.pop("password")
    doc["role"] = data.role

    if data.role == "vendor":
        uid = await create_vendor(db, doc)
    else:
        uid = await create_user(db, doc)

    token_data = {"id": uid, "role": data.role}
    access_token = create_access_token(token_data, expires_delta=timedelta(minutes=15))
    refresh_token = create_refresh_token(token_data, expires_delta=timedelta(days=7))

    return TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenPair)
async def login(
    creds: LoginPayload,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    # Look up from correct collection
    if creds.role == "vendor":
        account = await get_vendor_by_email(db, creds.email)
    else:
        account = await get_user_by_email(db, creds.email)

    # Uniform 401 for unknown email OR wrong password
    if not account or not verify_password(creds.password, account["hashed_password"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    # ---------- STATUS GATING ----------
    status_val = _normalize_status(account)

    if creds.role == "user":
        # Users blocked only if suspended; allow if None or active
        if status_val == "suspended":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is suspended. Please contact support.",
            )
    else:
        # Vendors: must be "active"
        if status_val is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your vendor account has not been reviewed yet. Please wait for approval.",
            )
        if status_val == "pending":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your vendor account is pending approval.",
            )
        if status_val == "suspended":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your vendor account is suspended.",
            )
        if status_val != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Vendor login not allowed while status is '{status_val}'.",
            )

    # ---------- ISSUE TOKENS ----------
    token_data = {"id": str(account["_id"]), "role": creds.role}
    access_token = create_access_token(token_data, expires_delta=timedelta(minutes=15))
    refresh_token = create_refresh_token(token_data, expires_delta=timedelta(days=7))

    return TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenPair)
async def refresh_token(
    body: RefreshRequest,
):
    """
    Rotate tokens by providing refresh_token in the request body.
    """
    if not body.refresh_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing refresh token")

    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    token_data = {"id": payload["id"], "role": payload["role"]}
    new_access = create_access_token(token_data, expires_delta=timedelta(minutes=15))
    new_refresh = create_refresh_token(token_data, expires_delta=timedelta(days=7))
    return TokenPair(access_token=new_access, refresh_token=new_refresh)

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    body: Optional[LogoutRequest] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if body and body.refresh_token:
        payload = decode_token(body.refresh_token)
        if payload.get("type") == "refresh":
            await db.refresh_tokens.delete_one({"jti": payload["jti"]})
    return