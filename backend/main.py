# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# import your auth router (see step 2)
from controllers.auth import router as auth_router

app = FastAPI(
    title="Ombrello API",
    version="1.0.0",
    description="Backend for Ombrello umbrella-rental app",
)

# (Optional) CORS setup if your frontend runs on a different origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the auth routes under /auth
app.include_router(auth_router, prefix="/auth", tags=["auth"])

@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
