# backend/controllers/auth.py
from fastapi import APIRouter, Depends, HTTPException, Response, status, Cookie
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Union
from datetime import timedelta

from dependencies import get_db
from schemas.auth import SignupPayload, LoginPayload, Token
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

@router.post("/signup", response_model=Token)
async def signup(
    data: SignupPayload,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
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
    response.set_cookie("refresh_token", refresh_token, httponly=True, samesite="lax")
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(
    creds: LoginPayload,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    # Look up from correct collection
    if creds.role == "vendor":
        user = await get_vendor_by_email(db, creds.email)
    else:
        user = await get_user_by_email(db, creds.email)

    if not user or not verify_password(creds.password, user["hashed_password"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    token_data = {"id": str(user["_id"]), "role": creds.role}
    access_token = create_access_token(token_data, expires_delta=timedelta(minutes=15))
    refresh_token = create_refresh_token(token_data, expires_delta=timedelta(days=7))
    response.set_cookie("refresh_token", refresh_token, httponly=True, samesite="lax")
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/refresh", response_model=Token)
async def refresh_token(
    response: Response,
    refresh_token: Union[str, None] = Cookie(None),
):
    if not refresh_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing refresh token")
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError()
    except:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    token_data = {"id": payload["id"], "role": payload["role"]}
    new_access = create_access_token(token_data, expires_delta=timedelta(minutes=15))
    new_refresh = create_refresh_token(token_data, expires_delta=timedelta(days=7))
    response.set_cookie("refresh_token", new_refresh, httponly=True, samesite="lax")
    return {"access_token": new_access, "token_type": "bearer"}
