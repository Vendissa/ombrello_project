from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Tuple
from pymongo import ReturnDocument

COUNTERS_COLL = "counters"

async def next_seq_block(db: AsyncIOMotorDatabase, name: str, count: int) -> Tuple[int, int]:
    """
    Atomically reserve a block of 'count' sequential numbers for a named sequence.
    Returns (start, end) inclusive.
    """
    doc = await db[COUNTERS_COLL].find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": count}, "$setOnInsert": {"created_at": datetime.utcnow()}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    end = int(doc["seq"])
    start = end - count + 1
    return start, end

def format_umbrella_code(seq: int) -> str:
    return f"UMB-{seq:06d}"
