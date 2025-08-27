from fastapi import APIRouter, Depends, Query, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from dependencies import get_db
from schemas.umbrella import CreateUmbrella, UpdateUmbrella, UmbrellaOut, BulkAddUmbrellas
from models import umbrella as model

router = APIRouter(prefix="/admin/umbrellas", tags=["admin-umbrellas"])

@router.post("", response_model=UmbrellaOut, status_code=201)
async def create_umbrella(payload: CreateUmbrella, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        return await model.create(db, payload.model_dump())
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to create umbrella")

@router.post("/bulk", response_model=List[UmbrellaOut], status_code=201)
async def bulk_add_umbrellas(payload: BulkAddUmbrellas, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        return await model.bulk_create_for_shop(
            db,
            vendor_id=payload.vendor_id,
            count=payload.count,
            shop_name=payload.shop_name,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception:
        raise HTTPException(status_code=400, detail="Bulk add failed")

@router.get("", response_model=dict)
async def list_umbrellas(
    db: AsyncIOMotorDatabase = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, le=100),
    q: Optional[str] = None,
    status: Optional[str] = None,
    vendor_id: Optional[str] = None,
):
    items, total = await model.list_paged(db, page, page_size, q, status, vendor_id)
    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.get("/{uid}", response_model=UmbrellaOut)
async def get_one(uid: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    out = await model.get_by_id(db, uid)
    if not out:
        raise HTTPException(status_code=404, detail="Umbrella not found")
    return out

@router.patch("/{uid}", response_model=UmbrellaOut)
async def update_umbrella(uid: str, payload: UpdateUmbrella, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        out = await model.update(db, uid, {k: v for k, v in payload.model_dump().items() if v is not None})
        if not out:
            raise HTTPException(status_code=404, detail="Umbrella not found")
        return out
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.delete("/{uid}", response_model=dict)
async def retire_umbrella(uid: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    ok = await model.soft_delete(db, uid)
    if not ok:
        raise HTTPException(status_code=404, detail="Umbrella not found")
    return {"ok": True}
