# backend/crud/user.py

from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from utils.security import get_password_hash

async def create_user(db: AsyncIOMotorDatabase, user_data: dict) -> str:
    # user_data already has all required fields (incl. hashed_password)
    result = await db.users.insert_one(user_data)
    return str(result.inserted_id)

async def create_vendor(db: AsyncIOMotorDatabase, vendor_data: dict) -> str:
    result = await db.vendors.insert_one(vendor_data)
    return str(result.inserted_id)

async def get_user_by_email(
    db: AsyncIOMotorDatabase, email: str, role: str
) -> Optional[dict]:
    coll = db.users if role == "user" else db.vendors
    return await coll.find_one({"email": email})
