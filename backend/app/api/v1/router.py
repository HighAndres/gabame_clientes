from fastapi import APIRouter

from app.api.v1.routers import admin, auth, ecosistema, medicos, partners, usuarios

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(usuarios.router, prefix="/usuarios", tags=["usuarios"])
api_router.include_router(medicos.router, prefix="/medicos", tags=["medicos"])
api_router.include_router(partners.router, prefix="/partners", tags=["partners"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(ecosistema.router, prefix="/ecosistema", tags=["ecosistema"])
