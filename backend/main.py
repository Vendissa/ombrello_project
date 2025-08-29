from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.admin.auth_admin import router as auth_admin_router
from controllers.admin.admin_vendors import router as admin_vendors_controller_router
from controllers.auth import router as auth_router
from controllers.admin.admin_users import router as admin_users_router
from controllers.admin.admin_umbrellas import router as admin_umbrellas_controller_router
from controllers.admin.admin_metrics import router as admin_metrics_router
from controllers.vendor import rentals as rental_controller, vendor as vendor_controller
from controllers.vendor import returns as return_controller
from controllers.vendor import umbrella
from controllers.pricing_controller import router as pricing_router

app = FastAPI(
    title="Ombrello API",
    version="1.0.0",
    description="Backend for Ombrello umbrella-rental",
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


app.include_router(auth_admin_router, tags=["auth"])
app.include_router(admin_vendors_controller_router)
app.include_router(admin_users_router)
app.include_router(admin_umbrellas_controller_router)
app.include_router(admin_metrics_router)
app.include_router(rental_controller.router)
app.include_router(vendor_controller.router)
app.include_router(return_controller.router)
app.include_router(umbrella.router)
app.include_router(pricing_router)