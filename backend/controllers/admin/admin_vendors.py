# backend/controllers/admin_vendors.py
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from dependencies import get_db
from typing import Optional, Dict, Any, List
from bson import ObjectId
import io, csv

router = APIRouter(prefix="/admin/vendors", tags=["admin-vendors"])

ALLOWED_STATUSES = {"active", "suspended", "pending"}

def _to_out(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize vendor document for FE (stringify _id, keep field names)."""
    return {
        "id": str(doc["_id"]),
        "shop_name": doc.get("shop_name"),
        "shop_owner_name": doc.get("shop_owner_name"),
        "email": doc.get("email"),
        "business_reg_no": doc.get("business_reg_no"),
        "telephone": doc.get("telephone"),
        "status": doc.get("status"),
        "created_at": doc.get("created_at"),
    }

@router.get("")
async def list_vendors(
    db: AsyncIOMotorDatabase = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, le=100),
    q: Optional[str] = None,
    status: Optional[str] = None,
    business_reg_no: Optional[str] = None,
    sort: str = "-created_at",
):
    query: Dict[str, Any] = {}
    if q:
        query["$or"] = [
            {"shop_name": {"$regex": q, "$options": "i"}},
            {"shop_owner_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    if status:
        query["status"] = status
    if business_reg_no:
        query["business_reg_no"] = {"$regex": business_reg_no, "$options": "i"}

    skip = (page - 1) * page_size
    sort_field = sort.lstrip("-")
    sort_dir = -1 if sort.startswith("-") else 1

    cursor = (
        db.vendors
        .find(query)
        .sort(sort_field, sort_dir)
        .skip(skip)
        .limit(page_size)
    )

    items: List[Dict[str, Any]] = []
    async for v in cursor:
        items.append(_to_out(v))

    total = await db.vendors.count_documents(query)
    return {"items": items, "total": total}

@router.patch("/{vendor_id}/status")
async def update_vendor_status(
    vendor_id: str,
    payload: Dict[str, str],  # expects {"status": "..."}
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    status = (payload or {}).get("status")
    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {sorted(ALLOWED_STATUSES)}")

    if not ObjectId.is_valid(vendor_id):
        raise HTTPException(status_code=400, detail="Invalid vendor id")

    oid = ObjectId(vendor_id)
    res = await db.vendors.update_one({"_id": oid}, {"$set": {"status": status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")

    doc = await db.vendors.find_one({"_id": oid})
    return _to_out(doc)

@router.get("/export")
async def export_vendors(db: AsyncIOMotorDatabase = Depends(get_db)):
    cursor = db.vendors.find({})
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Shop", "Owner", "Email", "Telephone", "Business Reg. No.", "Status", "Created At"])
    async for v in cursor:
        writer.writerow([
            v.get("shop_name", ""),
            v.get("shop_owner_name", ""),
            v.get("email", ""),
            v.get("telephone", ""),
            v.get("business_reg_no", ""),
            v.get("status", ""),
            v.get("created_at", ""),
        ])
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vendors.csv"}
    )
