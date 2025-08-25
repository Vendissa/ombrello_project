# backend/dependencies.py

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from core.config import settings
from utils.security import decode_token

# DB
_client: AsyncIOMotorClient = None
def get_db() -> AsyncIOMotorDatabase:
    global _client
    if not _client:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client.ombrello_db

# Auth
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise JWTError()
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    return {"id": payload["id"], "role": payload["role"]}
