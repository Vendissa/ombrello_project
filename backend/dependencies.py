# backend/dependencies.py
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from bson import ObjectId
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

async def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    role = current_user.get("role")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


async def get_current_vendor(
    current: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    """
    Ensures token role is 'vendor' and returns the vendor DB document.
    """
    if current.get("role") != "vendor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor privileges required",
        )

    try:
        _id = ObjectId(current["id"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    vendor = await db.vendors.find_one({"_id": _id})
    if not vendor:
        # If vendors are stored in a single 'users' collection with role='vendor',
        # swap the collection lookup accordingly.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vendor not found",
        )

    # Optional extra gate (belt & suspenders): ensure active vendors only
    status_val = (vendor.get("status") or "").strip().lower()
    if status_val and status_val != "active":
        # You can relax this if you only enforce at login.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Vendor is not active (status='{status_val}')",
        )

    return vendor

async def get_current_user_doc(
    current: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    """
    Returns the *full DB document* of the current principal.
    If role == 'user' → from db.users
    If role == 'vendor' → from db.vendors
    """
    role = current.get("role")
    try:
        _id = ObjectId(current["id"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    if role == "user":
        doc = await db.users.find_one({"_id": _id})
    elif role == "vendor":
        doc = await db.vendors.find_one({"_id": _id})
    elif role == "admin":
        doc = await db.admins.find_one({"_id": _id}) if "admins" in await db.list_collection_names() else None
    else:
        doc = None

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found",
        )

    return doc