# controllers/admin/umbrellas_controller.py
from typing import Optional
from schemas.admin.umbrellas import UmbrellaCreateRequest, UmbrellaResponse, UmbrellaListResponse
from crud.umbrellas import insert_umbrella, query_umbrellas, get_umbrella_by_id
from utils.shortcode import generate_short_code
from utils.qr import build_qr_svg_from_payload, build_qr_png_from_payload
from core.constants import SHORTLINK_BASE
import io, zipfile
from utils.qr import build_qr_svg_from_payload, build_qr_png_from_payload
from utils.pdf import build_qr_sheet_pdf
from schemas.admin.umbrellas import UmbrellaBulkExportRequest
from fastapi import HTTPException

async def create_umbrella(db, payload: UmbrellaCreateRequest) -> UmbrellaResponse:
    # generate short code & payload
    short_code = await _next_unique_code(db)
    qr_payload = f"{SHORTLINK_BASE.rstrip('/')}/u/{short_code}"

    doc = {
        "umbrella_code": payload.umbrella_code or await _next_human_code(db),
        "qr_code": short_code,
        "qr_payload": qr_payload,
        "status": payload.status or "available",
        "vendor_id": payload.vendor_id,
        "city": payload.city,
    }
    saved = await insert_umbrella(db, doc)
    return UmbrellaResponse(**_serialize(saved))

async def list_umbrellas_ctrl(
    db, page: int, page_size: int, status: Optional[str],
    vendor_id: Optional[str], city: Optional[str], q: Optional[str], sort: Optional[str]
) -> UmbrellaListResponse:
    items, total = await query_umbrellas(db, page=page, page_size=page_size,
                                         status=status, vendor_id=vendor_id, city=city, q=q, sort=sort)
    return UmbrellaListResponse(
        items=[UmbrellaResponse(**_serialize(x)) for x in items],
        total=total, page=page, page_size=page_size
    )

async def get_qr_svg_ctrl(db, umbrella_id: str, mm: float, margin_mm: float, ecc: str) -> Optional[bytes]:
    doc = await get_umbrella_by_id(db, umbrella_id)
    if not doc or not doc.get("qr_payload"):
        return None
    return build_qr_svg_from_payload(doc["qr_payload"], mm=mm, margin_mm=margin_mm, ecc=ecc)

async def get_qr_png_ctrl(db, umbrella_id: str, mm: float, margin_mm: float, dpi: int, ecc: str) -> Optional[bytes]:
    doc = await get_umbrella_by_id(db, umbrella_id)
    if not doc or not doc.get("qr_payload"):
        return None
    return build_qr_png_from_payload(doc["qr_payload"], mm=mm, margin_mm=margin_mm, dpi=dpi, ecc=ecc)

# --- helpers ---

async def _next_unique_code(db) -> str:
    # generate until unique in collection (fast because codes are short)
    while True:
        code = generate_short_code(length=7)   # e.g., "AB12CD9"
        exists = await db.umbrellas.find_one({"qr_code": code})
        if not exists:
            return code

async def _next_human_code(db) -> str:
    # Generate a friendly umbrella_code (e.g., UMB-2025-000123)
    from datetime import datetime
    year = datetime.utcnow().year
    # naive count-based suffix (replace with counters for scale)
    count = await db.umbrellas.count_documents({})
    return f"UMB-{year}-{count+1:06d}"

def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def export_qr_bulk_ctrl(db, payload: UmbrellaBulkExportRequest):
    umbrellas = []

    # Case 1: existing umbrellas by IDs
    if payload.umbrella_ids:
        for uid in payload.umbrella_ids:
            doc = await get_umbrella_by_id(db, uid)
            if doc:
                umbrellas.append(doc)

    # Case 2: create new umbrellas
    elif payload.count and payload.vendor_id and payload.city:
        for _ in range(payload.count):
            new = await create_umbrella(db, UmbrellaCreateRequest(
                vendor_id=payload.vendor_id, city=payload.city
            ))
            umbrellas.append(new.dict())

    if not umbrellas:
        raise HTTPException(status_code=400, detail="No umbrellas to export")

    if payload.format == "zip":
        # ZIP of PNGs
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for umb in umbrellas:
                png = build_qr_png_from_payload(umb["qr_payload"], mm=21, margin_mm=2, dpi=600)
                zf.writestr(f"{umb['umbrella_code']}.png", png)
        buf.seek(0)
        return buf.getvalue(), "application/zip", "umbrella_qrs.zip"

    else:
        # PDF sheet
        pdf_bytes = build_qr_sheet_pdf(umbrellas)
        return pdf_bytes, "application/pdf", "umbrella_qrs.pdf"