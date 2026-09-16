from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errores import ErrorNegocio


def documentacion(entorno: str) -> dict:
    """Esquema y documentacion interactiva solo fuera de produccion.

    En el portal, /api/v1/openapi.json era publico: cualquiera podia listar cada endpoint del
    panel, sus parametros y sus esquemas. No abre nada por si mismo (el backend autoriza cada
    llamada), pero es el mapa completo para quien busca por donde entrar.
    """
    if entorno == "production":
        return {"openapi_url": None, "docs_url": None, "redoc_url": None}
    return {"openapi_url": f"{settings.API_V1_PREFIX}/openapi.json"}


app = FastAPI(title=settings.PROJECT_NAME, **documentacion(settings.ENVIRONMENT))

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.exception_handler(ErrorNegocio)
def _error_negocio(_: Request, exc: ErrorNegocio) -> JSONResponse:
    """Misma forma que HTTPException: `detail` con `codigo` y `mensaje`."""
    return JSONResponse(
        status_code=exc.status,
        content={"detail": {"codigo": exc.codigo, "mensaje": exc.mensaje}},
    )


@app.get("/health", tags=["infra"])
def health() -> dict[str, str]:
    return {"status": "ok", "entorno": settings.ENVIRONMENT}
