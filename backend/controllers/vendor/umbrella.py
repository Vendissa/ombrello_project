# backend/controllers/umbrellas.py
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from dependencies import get_db, get_current_vendor
from schemas.admin.umbrellas import ReportBrokenUmbrella, UmbrellaOut
from crud.umbrellas import get_umbrella_by_id, set_umbrella_broken

router = APIRouter(prefix="/umbrellas", tags=["umbrellas"])

@router.post("/report-broken", response_model=UmbrellaOut, status_code=status.HTTP_200_OK)
async def report_broken(
    body: ReportBrokenUmbrella,
    db: AsyncIOMotorDatabase = Depends(get_db),
    vendor=Depends(get_current_vendor),  # auth: vendors only
):
    code = (body.code or "").strip()
    if not code:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "code is required")

    umbrella = await get_umbrella_by_id(db, code)
    if not umbrella:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Umbrella not found")

    # (Optional) ensure the umbrella belongs to this vendor/shop
    # if str(umbrella.get("owner_vendor_id")) != str(vendor["_id"]):
    #     raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed to modify this umbrella")

    updated = await set_umbrella_broken(db, code, set_status_maintenance=True)
    if not updated:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to update umbrella")

    return UmbrellaOut(
        code=updated["code"],
        status=updated.get("status"),
        condition=updated.get("condition"),
        updated_at=updated.get("updated_at"),
    )
