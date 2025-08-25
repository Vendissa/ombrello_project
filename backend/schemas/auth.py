# backend/schemas/auth.py

from pydantic import BaseModel, EmailStr, Field
from typing import Literal, Union

# Shared fields
class BaseSignup(BaseModel):
    role: Literal["user", "vendor"]
    email: EmailStr
    telephone: str
    password: str = Field(min_length=6)
    confirm_password: str

# Role‐specific extensions
class UserSignup(BaseSignup):
    role: Literal["user"]
    first_name: str

class VendorSignup(BaseSignup):
    role: Literal["vendor"]
    shop_name: str
    shop_owner_name: str
    business_reg_no: str

SignupPayload = Union[UserSignup, VendorSignup]

# Login
class LoginPayload(BaseModel):
    email: EmailStr
    password: str
    role: Literal["user", "vendor"]

# Token response
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
