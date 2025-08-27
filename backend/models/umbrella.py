from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
from typing import Dict, Any, Optional, Tuple, List

from utils.sequences import next_seq_block, format_umbrella_code
from utils.vendors import get_vendor_doc_or_raise

COLLECTION = "umbrellas"

async def ensure_indexes(db: AsyncIOMotorDatabase):
    await db[COLLECTION].create_index("code", unique=True)
    await db[COLLECTION].create_index([("vendor_id", 1), ("status", 1)])

def _out(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "code": doc["code"],
        "vendor_id": str(doc["vendor_id"]) if doc.get("vendor_id") else None,
        "shop_name": doc.get("shop_name"),
        "status": doc.get("status"),
        "condition": doc.get("condition"),
        "rented_date": doc.get("rented_date"),
        "qr_value": doc.get("qr_value", doc["code"]),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }

async def create(db: AsyncIOMotorDatabase, payload: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.utcnow()

    # vendor required + exists (active)
    if not payload.get("vendor_id"):
        raise ValueError("vendor_id is required")
    vendor_doc = await get_vendor_doc_or_raise(db, payload["vendor_id"], require_active=True)

    # code auto-gen if missing
    code = (payload.get("code") or "").strip()
    if not code:
        start, _ = await next_seq_block(db, "umbrellas", 1)
        code = format_umbrella_code(start)

    # rented_date clears unless status='rented'
    rented_date = payload.get("rented_date")
    if payload.get("status") != "rented":
        rented_date = None

    to_insert = {
        **payload,
        "code": code,
        "vendor_id": vendor_doc["_id"],
        "status": payload.get("status", "available"),
        "condition": payload.get("condition", "good"),
        "rented_date": rented_date,
        "qr_value": payload.get("qr_value", code),
        "created_at": now,
        "updated_at": now,
    }

    res = await db[COLLECTION].insert_one(to_insert)
    saved = await db[COLLECTION].find_one({"_id": res.inserted_id})
    return _out(saved)

async def bulk_create_for_shop(
    db: AsyncIOMotorDatabase,
    vendor_id: str,
    count: int,
    shop_name: Optional[str] = None,
) -> List[Dict[str, Any]]:
    # validate vendor
    vendor_doc = await get_vendor_doc_or_raise(db, vendor_id, require_active=True)

    now = datetime.utcnow()
    start, end = await next_seq_block(db, "umbrellas", count)
    codes = [format_umbrella_code(i) for i in range(start, end + 1)]

    docs = [{
        "code": code,
        "vendor_id": vendor_doc["_id"],
        "shop_name": shop_name,
        "status": "available",
        "condition": "good",
        "rented_date": None,
        "qr_value": code,
        "created_at": now,
        "updated_at": now,
    } for code in codes]

    if docs:
        await db[COLLECTION].insert_many(docs)

    cursor = db[COLLECTION].find({"code": {"$in": codes}}).sort("code", 1)
    return [_out(x) async for x in cursor]

async def get_by_id(db: AsyncIOMotorDatabase, uid: str) -> Optional[Dict[str, Any]]:
    from bson.errors import InvalidId
    try:
        oid = ObjectId(uid)
    except InvalidId:
        return None
    doc = await db[COLLECTION].find_one({"_id": oid})
    return _out(doc) if doc else None

async def list_paged(
    db: AsyncIOMotorDatabase,
    page: int,
    page_size: int,
    q: Optional[str],
    status: Optional[str],
    vendor_id: Optional[str],
) -> Tuple[list, int]:
    filt: Dict[str, Any] = {}
    if q:
        filt["code"] = {"$regex": q, "$options": "i"}
    if status:
        filt["status"] = status
    if vendor_id:
        try:
            filt["vendor_id"] = ObjectId(vendor_id)
        except Exception:
            pass

    cursor = (
        db[COLLECTION]
        .find(filt)
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    total = await db[COLLECTION].count_documents(filt)
    items = [_out(x) async for x in cursor]
    return items, total

async def update(db: AsyncIOMotorDatabase, uid: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if "vendor_id" in payload:
        if not payload["vendor_id"]:
            raise ValueError("vendor_id cannot be empty")
        payload["vendor_id"] = await get_vendor_doc_or_raise(db, payload["vendor_id"], require_active=True)

    if payload.get("status") and payload["status"] != "rented":
        payload["rented_date"] = None

    payload["updated_at"] = datetime.utcnow()
    await db[COLLECTION].update_one({"_id": ObjectId(uid)}, {"$set": payload})
    return await get_by_id(db, uid)

async def soft_delete(db: AsyncIOMotorDatabase, uid: str) -> bool:
    res = await db[COLLECTION].update_one(
        {"_id": ObjectId(uid)},
        {"$set": {"status": "retired", "updated_at": datetime.utcnow()}}
    )
    return res.modified_count == 1
