# backend/controllers/returns.py
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone

from dependencies import get_db, get_current_vendor
from schemas.rentals import RentalOut, ReturnRentalIn
from crud.rentals import (
    get_umbrella_by_id,
    complete_active_rental_for_umbrella,
    mark_umbrella_status,
)

router = APIRouter(prefix="/returns", tags=["returns"])

@router.post("", response_model=RentalOut, status_code=status.HTTP_200_OK)
async def return_by_umbrella(
    body: ReturnRentalIn,
    db: AsyncIOMotorDatabase = Depends(get_db),
    vendor = Depends(get_current_vendor),   # require auth; optionally restrict to same vendor
):
    """
    Return an umbrella by scanning its code.
    - Validates umbrella exists
    - Updates only the active rental (returned_at == None) to now
    - Marks umbrella status to 'available'
    """
    # 1) Validate umbrella exists
    umbrella = await get_umbrella_by_id(db, body.code)
    if not umbrella:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Umbrella not found")

    # 2) Close the active rental atomically
    returned_at = datetime.now(timezone.utc)
    updated = await complete_active_rental_for_umbrella(db, body.code, returned_at)
    if not updated:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No active rental exists for this umbrella (already returned or never rented).",
        )

    # (Optional) Restrict returns to original vendor
    # if str(updated.get("vendor_id")) != str(vendor["_id"]):
    #     raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot return rentals for another vendor")

    # 3) Mark umbrella as available; rollback rental if this fails
    matched = await mark_umbrella_status(db, body.code, "available")
    if matched == 0:
        # best-effort rollback of returned_at
        try:
            await db.rentals.update_one({"_id": updated["_id"]}, {"$set": {"returned_at": None}})
        finally:
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                "Umbrella status update failed; rental return was rolled back.",
            )

    # 4) Shape response using RentalOut
    return RentalOut(
        id=str(updated["_id"]),
        rental_id=updated["rental_id"],
        code=updated["code"],
        vendor_id=updated["vendor_id"],
        shop_name=updated.get("shop_name"),
        user_id=updated["user_id"],
        user_name=updated.get("user_name"),
        rented_at=updated["rented_at"],
        returned_at=updated.get("returned_at"),
        fee=updated.get("fee"),
    )
