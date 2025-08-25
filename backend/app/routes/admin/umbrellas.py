# app/routes/admin/umbrellas.py
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from typing import Optional
from schemas.admin.umbrellas import (
    UmbrellaCreateRequest, UmbrellaResponse, UmbrellaListResponse
)
from controllers.admin.umbrellas_controller import (
    create_umbrella, list_umbrellas_ctrl, get_qr_svg_ctrl, get_qr_png_ctrl
)
from dependencies import get_db, get_current_admin
from fastapi.responses import StreamingResponse
from schemas.admin.umbrellas import UmbrellaBulkExportRequest
from controllers.admin.umbrellas_controller import export_qr_bulk_ctrl
import io, zipfile

router = APIRouter(dependencies=[Depends(get_current_admin)])

@router.post("", response_model=UmbrellaResponse, status_code=201)
async def create_umbrella_api(
    payload: UmbrellaCreateRequest,
    db = Depends(get_db),
):
    return await create_umbrella(db, payload)

@router.get("", response_model=UmbrellaListResponse)
async def list_umbrellas_api(
    db = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    status: Optional[str] = Query(None, regex="^(available|in_use|broken|lost)$"),
    vendor_id: Optional[str] = None,
    city: Optional[str] = None,
    q: Optional[str] = None,
    sort: Optional[str] = Query("-created_at"),
):
    return await list_umbrellas_ctrl(
        db=db, page=page, page_size=page_size, status=status,
        vendor_id=vendor_id, city=city, q=q, sort=sort
    )

@router.get("/{umbrella_id}/qr.svg")
async def get_qr_svg_api(
    umbrella_id: str,
    db = Depends(get_db),
    mm: float = Query(21.0, gt=5, lt=60),
    margin_mm: float = Query(2.0, ge=0, lt=10),
    ecc: str = Query("Q"),
):
    svg_bytes = await get_qr_svg_ctrl(db, umbrella_id, mm=mm, margin_mm=margin_mm, ecc=ecc)
    if not svg_bytes:
        raise HTTPException(status_code=404, detail="Umbrella or QR not found")
    return Response(content=svg_bytes, media_type="image/svg+xml")

@router.get("/{umbrella_id}/qr.png")
async def get_qr_png_api(
    umbrella_id: str,
    db = Depends(get_db),
    mm: float = Query(21.0, gt=5, lt=60),
    margin_mm: float = Query(2.0, ge=0, lt=10),
    dpi: int = Query(600, ge=72, le=1200),
    ecc: str = Query("Q"),
):
    png_bytes = await get_qr_png_ctrl(db, umbrella_id, mm=mm, margin_mm=margin_mm, dpi=dpi, ecc=ecc)
    if not png_bytes:
        raise HTTPException(status_code=404, detail="Umbrella or QR not found")
    return Response(content=png_bytes, media_type="image/png")
    
@router.post("/export-qr")
async def export_qr_bulk_api(
    payload: UmbrellaBulkExportRequest,
    db = Depends(get_db),
):
    file_bytes, media_type, filename = await export_qr_bulk_ctrl(db, payload)
    return StreamingResponse(io.BytesIO(file_bytes), media_type=media_type, headers={
        "Content-Disposition": f'attachment; filename="{filename}"'
    })