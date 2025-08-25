# crud/umbrellas.py
from typing import List, Tuple, Optional

def _coll(db):
    return db.umbrellas  # MongoDB collection

async def insert_umbrella(db, doc: dict) -> dict:
    res = await _coll(db).insert_one({
        **doc,
        "created_at": __import__("datetime").datetime.utcnow(),
    })
    return await _coll(db).find_one({"_id": res.inserted_id})

async def get_umbrella_by_id(db, umbrella_id: str) -> Optional[dict]:
    from bson import ObjectId
    try:
        oid = ObjectId(umbrella_id)
    except Exception:
        return None
    return await _coll(db).find_one({"_id": oid})

async def query_umbrellas(
    db, page: int, page_size: int,
    status: Optional[str], vendor_id: Optional[str],
    city: Optional[str], q: Optional[str], sort: Optional[str]
) -> Tuple[List[dict], int]:
    filters = {}
    if status: filters["status"] = status
    if vendor_id: filters["vendor_id"] = vendor_id
    if city: filters["city"] = city
    if q:
        # simple text search on code fields
        filters["$or"] = [
            {"umbrella_code": {"$regex": q, "$options": "i"}},
            {"qr_code": {"$regex": q, "$options": "i"}},
        ]
    total = await _coll(db).count_documents(filters)

    sort_list = [("created_at", -1)]
    if sort:
        direction = -1 if sort.startswith("-") else 1
        field = sort.lstrip("+-")
        sort_list = [(field, direction)]

    cursor = _coll(db).find(filters).sort(sort_list).skip((page - 1) * page_size).limit(page_size)
    items = await cursor.to_list(length=page_size)
    return items, total
