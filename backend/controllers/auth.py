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
from crud.user import create_user, get_user_by_email, create_vendor

router = APIRouter()

@router.post("/signup", response_model=Token)
async def signup(
    data: SignupPayload,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if data.password != data.confirm_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Passwords do not match")

    existing = await get_user_by_email(db, data.email, data.role)
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")

    # Hash & insert
    user_dict = data.dict(exclude={"confirm_password"})
    user_dict["hashed_password"] = get_password_hash(data.password)
    user_dict.pop("password")
    uid = await create_user(db, user_dict)
    if data.role == "vendor":
        uid = await create_vendor(db, user_dict)
    else:
        uid = await create_user(db, user_dict)

    # Issue tokens
    token_data = {"id": uid, "role": data.role}
    access_token = create_access_token(token_data, expires_delta=timedelta(minutes=15))
    refresh_token = create_refresh_token(token_data, expires_delta=timedelta(days=7))

    # Set refresh token in HttpOnly cookie
    response.set_cookie("refresh_token", refresh_token, httponly=True, samesite="lax")
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(
    creds: LoginPayload,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await get_user_by_email(db, creds.email, creds.role)
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
