# crud/users.py
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

async def create_user(db: AsyncIOMotorDatabase, user_data: dict) -> str:
    res = await db.users.insert_one(user_data)
    return str(res.inserted_id)

async def create_vendor(db: AsyncIOMotorDatabase, vendor_data: dict) -> str:
    res = await db.vendors.insert_one(vendor_data)
    return str(res.inserted_id)

# --- explicit helpers ---

async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[dict]:
    return await db.users.find_one({"email": email})

async def get_vendor_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[dict]:
    return await db.vendors.find_one({"email": email})

async def get_admin_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[dict]:
    return await db.users.find_one({"email": email, "role": "admin"})