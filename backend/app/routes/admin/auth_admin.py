# app/routes/admin/auth_admin.py
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr

from dependencies import get_db
from crud.user import get_admin_by_email
from utils.security import verify_password, create_access_token

router = APIRouter(prefix="/auth/admin", tags=["auth"])

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

@router.post("/login", response_model=TokenResponse)
async def admin_login(payload: AdminLoginRequest, db = Depends(get_db)):
    user = await get_admin_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"id": str(user["_id"]), "role": "admin", "type": "access"})
    return TokenResponse(access_token=token)