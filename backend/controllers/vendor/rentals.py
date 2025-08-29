# backend/controllers/rentals.py
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import secrets
from pymongo.errors import DuplicateKeyError 
from typing import List, Optional
from bson import ObjectId
from dependencies import get_db, get_current_vendor, get_current_user
from schemas.rentals import AssignRentalIn, MyActiveRentalOut, RentalOut
from crud.rentals import (
    get_user_by_id, get_umbrella_by_id, get_active_rental_for_umbrella,
    mark_umbrella_status, create_rental,
)

router = APIRouter(prefix="/rentals", tags=["rentals"])

def _extract_user_id(user) -> str:
    """
    Accepts:
      - dict with _id or id
      - Pydantic model with id / _id
      - token payload dict with id
    Returns string id or raises 401/500 accordingly.
    """
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    # Dicts
    if isinstance(user, dict):
        if "_id" in user:
            return str(user["_id"])
        if "id" in user:
            return str(user["id"])

    # Pydantic / objects
    for attr in ("id", "_id"):
        if hasattr(user, attr):
            return str(getattr(user, attr))

    # Token-payload-only case (get_current_user may pass payload)
    if isinstance(user, dict) and "sub" in user:
        return str(user["sub"])
    if isinstance(user, dict) and "user_id" in user:
        return str(user["user_id"])

    # Nothing worked
    raise HTTPException(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "Authenticated user is missing an id; check get_current_user()"
    )


def _looks_like_oid(s: str) -> bool:
    try:
        ObjectId(s); return True
    except Exception:
        return False

def generate_rental_id() -> str:
    # Example: RENT-YYYYMMDD-<6 hex chars>
    ts = datetime.now(timezone.utc).strftime("%Y%m%d")
    rand = secrets.token_hex(3).upper()  # 6 hex
    return f"RENT-{ts}-{rand}"

@router.post("/assign", response_model=RentalOut)
async def assign_rental(
    body: AssignRentalIn,
    db: AsyncIOMotorDatabase = Depends(get_db),
    vendor=Depends(get_current_vendor),
):
    # 1) Validate user
    user = await get_user_by_id(db, body.user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    # 2) Validate umbrella
    umbrella = await get_umbrella_by_id(db, body.code)
    if not umbrella:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Umbrella not found")

    # 3) Availability checks
    if await get_active_rental_for_umbrella(db, body.code):
        raise HTTPException(status.HTTP_409_CONFLICT, "Umbrella is already rented")

    status_val = (umbrella.get("status") or "").strip().lower()
    if status_val and status_val != "available":
        raise HTTPException(status.HTTP_409_CONFLICT, f"Umbrella is not available (status={status_val})")

    # 4) Create rental (with unique rental_id)
    rented_at = datetime.now(timezone.utc)
    fee_val = body.fee if body.fee is not None else None
    base_doc = {
        "code": body.code,
        "vendor_id": str(vendor["_id"]),
        "shop_name": body.shop_name or vendor.get("shop_name"),
        "user_id": str(user["_id"]),
        "user_name": user.get("first_name") or user.get("name"),
        "rented_at": rented_at,
        "returned_at": None,
        "fee": fee_val,
    }

    inserted_id: str | None = None
    final_rental_id: str | None = None

    for _ in range(6):  # try a few times if collision
        rid = generate_rental_id()
        doc = {**base_doc, "rental_id": rid}
        try:
            inserted_id = await create_rental(db, doc)  # your helper calls insert_one
            final_rental_id = rid
            break
        except DuplicateKeyError:
            continue

    if not inserted_id or not final_rental_id:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not generate a unique rental ID")

    # 5) Mark umbrella as rented
    await mark_umbrella_status(db, body.code, "rented")

    return RentalOut(
        id=inserted_id,
        rental_id=final_rental_id,
        code=base_doc["code"],
        vendor_id=base_doc["vendor_id"],
        shop_name=base_doc.get("shop_name"),
        user_id=base_doc["user_id"],
        user_name=base_doc.get("user_name"),
        rented_at=rented_at,
        returned_at=None,
        fee=fee_val,
    )
@router.get("/my-active", response_model=List[MyActiveRentalOut])
async def list_my_active_rentals(
    db: AsyncIOMotorDatabase = Depends(get_db),
    user = Depends(get_current_user),
):
    user_id = _extract_user_id(user)

    # support either "code" (new) or "umbrella_id" (legacy) in rentals
    cursor = db.rentals.find(
        {"user_id": user_id, "returned_at": None},
        {
            "_id": 1,
            "rental_id": 1,
            "rented_at": 1,
            "code": 1,
            "umbrella_id": 1,
        },
    ).sort("rented_at", -1)

    docs = await cursor.to_list(length=200)

    out: list[MyActiveRentalOut] = []
    for d in docs:
        umbrella_code = d.get("code")
        if not umbrella_code:
            u = d.get("umbrella_id")
            if isinstance(u, str):
                if _looks_like_oid(u):
                    umb = await db.umbrellas.find_one({"_id": ObjectId(u)}, {"code": 1})
                    umbrella_code = umb.get("code") if umb else None
                else:
                    umbrella_code = u

        out.append(MyActiveRentalOut(
            id=str(d["_id"]),
            rental_id=d.get("rental_id", ""),
            umbrella_code=umbrella_code,
            rented_at=d["rented_at"],
        ))
    return out