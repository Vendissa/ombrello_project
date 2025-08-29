from typing import Optional, Dict, Any, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from pymongo import ReturnDocument
from dependencies import get_db, get_current_user

# ---------- helpers for specific collections ----------
def _vendors(db: AsyncIOMotorDatabase):
    return db.vendors

def _umbrellas(db: AsyncIOMotorDatabase):
    return db.umbrellas

def _rentals(db: AsyncIOMotorDatabase):
    return db.rentals


# ---------- users / vendors ----------
async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: str) -> Optional[Dict[str, Any]]:
    try:
        _id = ObjectId(user_id)
    except Exception:
        return None
    return await db.users.find_one({"_id": _id})

async def get_vendor_by_id(db: AsyncIOMotorDatabase, vendor_id: str) -> Optional[Dict[str, Any]]:
    try:
        _id = ObjectId(vendor_id)
    except Exception:
        return None
    return await _vendors(db).find_one({"_id": _id})


# ---------- umbrellas (keyed by `code`) ----------
async def get_umbrella_by_id(db: AsyncIOMotorDatabase, code: str) -> Optional[Dict[str, Any]]:
    return await _umbrellas(db).find_one({"code": code})

# (optional clearer alias)
async def get_umbrella_by_code(db: AsyncIOMotorDatabase, code: str) -> Optional[Dict[str, Any]]:
    return await _umbrellas(db).find_one({"code": code})

async def mark_umbrella_status(db: AsyncIOMotorDatabase, code: str, status: str) -> int:
    res = await _umbrellas(db).update_one(
        {"code": code},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}},
    )
    return res.matched_count


# ---------- rentals (keyed by umbrella `code`) ----------
async def create_rental(db: AsyncIOMotorDatabase, doc: Dict[str, Any]) -> str:
    res = await _rentals(db).insert_one(doc)
    return str(res.inserted_id)

async def get_active_rental_for_umbrella(db: AsyncIOMotorDatabase, code: str) -> Optional[Dict[str, Any]]:
    return await _rentals(db).find_one({"code": code, "returned_at": None})

async def complete_active_rental_for_umbrella(
    db: AsyncIOMotorDatabase,
    code: str,
    returned_at: datetime,
) -> Optional[Dict[str, Any]]:
    return await _rentals(db).find_one_and_update(
        {"code": code, "returned_at": None},
        {"$set": {"returned_at": returned_at}},
        return_document=ReturnDocument.AFTER,
    )


# ---------- vendor location (GeoJSON Point) ----------
async def update_vendor_location(
    db: AsyncIOMotorDatabase,
    vendor_id: str,
    location: Dict[str, Any],   # {"type": "Point", "coordinates": [lng, lat]}
    address: Optional[str],
) -> Optional[Dict[str, Any]]:
    try:
        _id = ObjectId(vendor_id)
    except Exception:
        return None

    update: Dict[str, Any] = {
        "$set": {
            "location": location,
            "updated_at": datetime.now(timezone.utc),
        }
    }
    if address is not None:
        update["$set"]["address"] = address

    await _vendors(db).update_one({"_id": _id}, update)
    return await _vendors(db).find_one({"_id": _id})

# List vendors that already have a valid location (GeoJSON Point)
async def list_vendors_with_locations(
    db: AsyncIOMotorDatabase,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    cursor = _vendors(db).find({
        "location": { "$exists": True, "$ne": None },
        "location.type": "Point",
        # coordinates[0] = lng, coordinates[1] = lat
        "location.coordinates.0": { "$type": "number" },
        "location.coordinates.1": { "$type": "number" },
    }).limit(limit)
    return await cursor.to_list(length=limit)

