from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from dependencies import get_db
from schemas.admin.umbrellas import CreateUmbrella, UpdateUmbrella, UmbrellaOut, BulkAddUmbrellas
from models import umbrella as model
import io, zipfile
from utils.qr import generate_qr_png
from utils.vendors import get_vendor_doc_or_raise
from bson import ObjectId
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader

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

@router.get("/vendor/{vendor_id}/qr.zip")
async def qr_zip_for_vendor(
    vendor_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    data: str = Query("code", pattern="^(code|id|qr_value)$"),
    include_text: bool = Query(True),
    include_retired: bool = Query(False),
    box_size: int = Query(10, ge=2, le=20),
    border: int = Query(2, ge=0, le=8),
):
    # validate vendor (active or not; you can flip to require_active=True)
    vendor_doc = await get_vendor_doc_or_raise (db, vendor_id, require_active=False)
    filt = {"vendor_id": vendor_doc["_id"]}
    if not include_retired:
        filt["status"] = {"$ne": "retired"}

    cursor = db["umbrellas"].find(filt, {"_id": 1, "code": 1, "qr_value": 1, "shop_name": 1})

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        async for u in cursor:
            code = u.get("code") or str(u["_id"])
            payload = (
                str(u["_id"]) if data == "id"
                else u.get("qr_value") or code if data == "qr_value"
                else code
            )
            label = f"{code} — {u.get('shop_name','')}".strip(" —") if include_text else None
            png = generate_qr_png(payload, box_size=box_size, border=border, label_text=label)
            zf.writestr(f"{code}.png", png)

    buf.seek(0)
    filename = f"vendor-{vendor_id}-umbrellas-qr.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.get("/vendor/{vendor_id}/qr.pdf")
async def qr_pdf_for_vendor(
    vendor_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    data: str = Query("code", pattern="^(code|id|qr_value)$"),
    include_retired: bool = Query(False),
    cols: int = Query(3, ge=1, le=5),
    rows: int = Query(8, ge=1, le=15),
    cell_margin_mm: float = Query(4.0, ge=0.0, le=10.0),
    show_text: bool = Query(True),
):
    vendor_doc = await get_vendor_doc_or_raise(db, vendor_id, require_active=False)
    filt = {"vendor_id": vendor_doc["_id"]}
    if not include_retired:
        filt["status"] = {"$ne": "retired"}

    cursor = db["umbrellas"].find(filt, {"_id": 1, "code": 1, "qr_value": 1, "shop_name": 1})

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    page_w, page_h = A4
    margin = 10 * mm
    grid_w = page_w - 2 * margin
    grid_h = page_h - 2 * margin
    step_x = grid_w / cols
    step_y = grid_h / rows
    pad = cell_margin_mm * mm

    col = row = 0
    async for u in cursor:
        code = u.get("code") or str(u["_id"])
        payload = (
            str(u["_id"]) if data == "id"
            else u.get("qr_value") or code if data == "qr_value"
            else code
        )
        # Generate QR at suitable resolution
        png = generate_qr_png(payload, box_size=8, border=1, label_text=None)
        img = ImageReader(io.BytesIO(png))

        # cell box
        cell_w, cell_h = step_x, step_y
        usable_w, usable_h = cell_w - 2 * pad, cell_h - 2 * pad
        size = min(usable_w, usable_h - (10 if show_text else 0))

        x = margin + col * step_x + (cell_w - size) / 2
        y = page_h - margin - (row + 1) * step_y + (cell_h - size) / 2

        c.drawImage(img, x, y, width=size, height=size, preserveAspectRatio=True, mask='auto')

        if show_text:
            c.setFont("Helvetica", 8)
            label = f"{code}  {u.get('shop_name','')}".strip()
            c.drawCentredString(x + size / 2, y - 3, label)

        col += 1
        if col >= cols:
            col = 0
            row += 1
            if row >= rows:
                c.showPage()
                row = 0

    if col or row:
        c.showPage()
    c.save()
    buf.seek(0)
    filename = f"vendor-{vendor_id}-umbrellas-qr.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.get("/{uid}/qr.png")
async def qr_for_one(
    uid: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    data: str = Query("code", pattern="^(code|id|qr_value)$"),
    label: bool = Query(True),
):
    from bson.errors import InvalidId
    try:
        oid = ObjectId(uid)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid id")

    u = await db["umbrellas"].find_one({"_id": oid})
    if not u:
        raise HTTPException(status_code=404, detail="Umbrella not found")

    code = u.get("code") or str(u["_id"])
    payload = (
        str(u["_id"]) if data == "id"
        else u.get("qr_value") or code if data == "qr_value"
        else code
    )
    label_text = f"{code} — {u.get('shop_name','')}".strip(" —") if label else None
    png = generate_qr_png(payload, box_size=10, border=2, label_text=label_text)

    return StreamingResponse(io.BytesIO(png), media_type="image/png")

