from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase

VENDORS_COLL = "vendors"

async def get_vendor_doc_or_raise(
    db: AsyncIOMotorDatabase,
    vendor_id: str,
    *,
    require_active: bool = True,
):
    """
    Return the vendor document (only a few fields) or raise ValueError.
    """
    try:
        oid = ObjectId(vendor_id)
    except InvalidId:
        raise ValueError("Invalid vendor_id")

    filt = {"_id": oid}
    if require_active:
        filt["status"] = "active"

    doc = await db[VENDORS_COLL].find_one(filt, {"_id": 1, "shop_name": 1, "status": 1})
    if not doc:
        raise ValueError("Vendor not found or not eligible")
    return doc  # contains _id, shop_name, status
