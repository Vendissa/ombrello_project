# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.admin.umbrellas import router as admin_umbrellas_router

from controllers.auth import router as auth_router

app = FastAPI(
    title="Ombrello API",
    version="1.0.0",
    description="Backend for Ombrello umbrella-rental app",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the auth routes under /auth
app.include_router(auth_router, prefix="/auth", tags=["auth"])

@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}

app.include_router(admin_umbrellas_router, prefix="/admin/umbrellas", tags=["admin: umbrellas"])
