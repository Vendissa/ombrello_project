# backend/controllers/admin_users.py
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from dependencies import get_db
from typing import Optional, Dict, Any, List
from bson import ObjectId
import io, csv

router = APIRouter(prefix="/admin/users", tags=["admin-users"])

ALLOWED_STATUSES = {"active", "suspended"} 

def _to_out(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize user document for FE."""
    return {
        "id": str(doc["_id"]),
        "first_name": doc.get("first_name"),
        "email": doc.get("email"),
        "telephone": doc.get("telephone"),
        "status": doc.get("status"),
        "created_at": doc.get("created_at"),
    }

@router.get("")
async def list_users(
    db: AsyncIOMotorDatabase = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, le=100),
    q: Optional[str] = None,              
    status: Optional[str] = None,            
    sort: str = "-created_at",
):
    query: Dict[str, Any] = {
        "role": {"$ne": "admin"}             
    }

    if q:
        query["$or"] = [
            {"first_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"telephone": {"$regex": q, "$options": "i"}},
        ]
    if status:
        query["status"] = status

    skip = (page - 1) * page_size
    sort_field = sort.lstrip("-")
    sort_dir = -1 if sort.startswith("-") else 1

    cursor = (
        db.users
        .find(query)
        .sort(sort_field, sort_dir)
        .skip(skip)
        .limit(page_size)
    )

    items: List[Dict[str, Any]] = []
    async for u in cursor:
        items.append(_to_out(u))

    total = await db.users.count_documents(query)
    return {"items": items, "total": total}

@router.patch("/{user_id}/status")
async def update_user_status(
    user_id: str,
    payload: Dict[str, str],  # expects {"status": "..."}
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    status = (payload or {}).get("status")
    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {sorted(ALLOWED_STATUSES)}")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    oid = ObjectId(user_id)
    doc = await db.users.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")

    # <-- forbid changing admin accounts
    if doc.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Cannot change status of admin accounts")

    res = await db.users.update_one({"_id": oid}, {"$set": {"status": status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")  # safety

    updated = await db.users.find_one({"_id": oid})
    return _to_out(updated)

@router.get("/export")
async def export_users(db: AsyncIOMotorDatabase = Depends(get_db)):
    # only non-admins
    cursor = db.users.find({"role": {"$ne": "admin"}})
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Name", "Email", "Telephone", "Role", "Status"])
    async for u in cursor:
        writer.writerow([
            u.get("first_name", ""),
            u.get("email", ""),
            u.get("telephone", ""),
            u.get("role", "user"),
            u.get("status", ""),
        ])
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users.csv"}
    )
