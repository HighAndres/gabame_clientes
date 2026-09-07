"""Router: admin. Colas de validacion y usuarios. El alcance se resuelve en deps (ADR-0004)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import false, func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import AlcanceAdmin, DbSession, UsuarioActual, require_alcance_medicos
from app.core.enums import Empresa, EstadoValidacion, Rol
from app.core.matriz import Alcance
from app.models import (
    AreaTerapeutica,
    FichaTecnica,
    PerfilMedico,
    PerfilPartner,
    Usuario,
    UsuarioRol,
)
from app.schemas.admin import (
    DecisionIn,
    MedicoAdminOut,
    PaginaUsuarios,
    PartnerAdminOut,
    ResumenAdmin,
    UsuarioAdminOut,
)
from app.schemas.contenido import AreaIn, AreaOut, AreaUpdate, FichaIn, FichaOut, FichaUpdate
from app.schemas.partner import DecisionDocumentoIn, DocumentoOut
from app.services import contenido, documentos, validacion

router = APIRouter()

AlcanceMedicos = Annotated[Alcance, Depends(require_alcance_medicos)]


def _prohibido(mensaje: str) -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, {"codigo": "prohibido", "mensaje": mensaje})


# ---------- resumen ----------


@router.get("/resumen", response_model=ResumenAdmin)
def resumen(alcance: AlcanceAdmin, db: DbSession) -> ResumenAdmin:
    partners = select(func.count()).select_from(PerfilPartner).where(
        PerfilPartner.estado == EstadoValidacion.PENDIENTE
    )
    if alcance.empresas_partner is not None:
        partners = partners.where(PerfilPartner.empresa_objetivo.in_(alcance.empresas_partner))

    medicos = None
    if alcance.ve_medicos:
        medicos = db.scalar(
            select(func.count()).select_from(PerfilMedico).where(PerfilMedico.estado == EstadoValidacion.PENDIENTE)
        )
    usuarios = db.scalar(select(func.count()).select_from(Usuario)) if alcance.grupo else None

    return ResumenAdmin(
        medicos_pendientes=medicos,
        partners_pendientes=db.scalar(partners) or 0,
        usuarios_total=usuarios,
        alcance_grupo=alcance.grupo,
        empresas=sorted(alcance.empresas),
    )


# ---------- usuarios ----------


def _usuarios_visibles(db: Session, alcance: Alcance):
    """Consulta base de usuarios dentro del alcance del admin (matriz provisional)."""
    q = select(Usuario)
    if alcance.grupo:
        return q
    condiciones = []
    if alcance.empresas:
        condiciones.append(
            Usuario.id.in_(
                select(PerfilPartner.usuario_id).where(PerfilPartner.empresa_objetivo.in_(alcance.empresas))
            )
        )
    if alcance.ve_medicos:
        condiciones.append(Usuario.id.in_(select(PerfilMedico.usuario_id)))
    return q.where(or_(*condiciones)) if condiciones else q.where(false())


@router.get("/usuarios", response_model=PaginaUsuarios)
def listar_usuarios(
    alcance: AlcanceAdmin,
    db: DbSession,
    rol: Rol | None = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginaUsuarios:
    base = _usuarios_visibles(db, alcance)
    if rol is not None:
        base = base.where(Usuario.id.in_(select(UsuarioRol.usuario_id).where(UsuarioRol.rol == rol)))
    if q:
        patron = f"%{q.strip().lower()}%"
        base = base.where(
            or_(
                func.lower(Usuario.email).like(patron),
                func.lower(Usuario.nombre).like(patron),
                func.lower(Usuario.apellidos).like(patron),
            )
        )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    items = db.scalars(base.order_by(Usuario.creado_en.desc()).limit(limit).offset(offset)).all()
    return PaginaUsuarios(total=total, items=[UsuarioAdminOut.desde_modelo(u) for u in items])


# ---------- medicos ----------


@router.get("/medicos", response_model=list[MedicoAdminOut])
def listar_medicos(
    alcance: AlcanceMedicos,
    db: DbSession,
    estado: EstadoValidacion | None = EstadoValidacion.PENDIENTE,
) -> list[MedicoAdminOut]:
    q = select(Usuario, PerfilMedico).join(PerfilMedico, PerfilMedico.usuario_id == Usuario.id)
    if estado is not None:
        q = q.where(PerfilMedico.estado == estado)
    filas = db.execute(q.order_by(PerfilMedico.creado_en)).all()
    return [MedicoAdminOut.desde_modelo(u, p) for u, p in filas]


@router.post("/medicos/{usuario_id}/validar", response_model=MedicoAdminOut)
def validar_medico(
    usuario_id: uuid.UUID, datos: DecisionIn, alcance: AlcanceMedicos, actor: UsuarioActual, db: DbSession
) -> MedicoAdminOut:
    perfil = validacion.validar_medico(db, actor, usuario_id, datos.motivo)
    return MedicoAdminOut.desde_modelo(db.get(Usuario, usuario_id), perfil)


@router.post("/medicos/{usuario_id}/rechazar", response_model=MedicoAdminOut)
def rechazar_medico(
    usuario_id: uuid.UUID, datos: DecisionIn, alcance: AlcanceMedicos, actor: UsuarioActual, db: DbSession
) -> MedicoAdminOut:
    perfil = validacion.rechazar_medico(db, actor, usuario_id, datos.motivo)
    return MedicoAdminOut.desde_modelo(db.get(Usuario, usuario_id), perfil)


# ---------- partners ----------


def _partner_en_alcance(db: Session, alcance: Alcance, usuario_id: uuid.UUID) -> PerfilPartner:
    perfil = db.get(PerfilPartner, usuario_id)
    if perfil is None:
        raise validacion.PerfilNoEncontrado()
    if not alcance.ve_partner_de(perfil.empresa_objetivo):
        raise _prohibido("Sin alcance sobre esta empresa")
    return perfil


@router.get("/partners", response_model=list[PartnerAdminOut])
def listar_partners(
    alcance: AlcanceAdmin,
    db: DbSession,
    estado: EstadoValidacion | None = EstadoValidacion.PENDIENTE,
    empresa: Empresa | None = None,
) -> list[PartnerAdminOut]:
    q = select(Usuario, PerfilPartner).join(PerfilPartner, PerfilPartner.usuario_id == Usuario.id)
    if alcance.empresas_partner is not None:
        q = q.where(PerfilPartner.empresa_objetivo.in_(alcance.empresas_partner))
    if empresa is not None:
        q = q.where(PerfilPartner.empresa_objetivo == empresa)
    if estado is not None:
        q = q.where(PerfilPartner.estado == estado)
    filas = db.execute(q.order_by(PerfilPartner.creado_en)).all()
    return [PartnerAdminOut.desde_modelo(u, p) for u, p in filas]


@router.post("/partners/{usuario_id}/aprobar", response_model=PartnerAdminOut)
def aprobar_partner(
    usuario_id: uuid.UUID, datos: DecisionIn, alcance: AlcanceAdmin, actor: UsuarioActual, db: DbSession
) -> PartnerAdminOut:
    _partner_en_alcance(db, alcance, usuario_id)
    perfil = validacion.aprobar_partner(db, actor, usuario_id, datos.motivo)
    return PartnerAdminOut.desde_modelo(db.get(Usuario, usuario_id), perfil)


@router.post("/partners/{usuario_id}/rechazar", response_model=PartnerAdminOut)
def rechazar_partner(
    usuario_id: uuid.UUID, datos: DecisionIn, alcance: AlcanceAdmin, actor: UsuarioActual, db: DbSession
) -> PartnerAdminOut:
    _partner_en_alcance(db, alcance, usuario_id)
    perfil = validacion.rechazar_partner(db, actor, usuario_id, datos.motivo)
    return PartnerAdminOut.desde_modelo(db.get(Usuario, usuario_id), perfil)


# ---------- contenido Rx (mismo alcance que la validacion de medicos: GABAME o grupo) ----------


@router.get("/contenido/areas", response_model=list[AreaOut])
def listar_areas_admin(alcance: AlcanceMedicos, db: DbSession) -> list[AreaOut]:
    """Todo, publicado o no: el admin edita; los medicos solo ven lo publicado."""
    areas = db.scalars(select(AreaTerapeutica).order_by(AreaTerapeutica.orden, AreaTerapeutica.nombre)).all()
    return [AreaOut.desde_modelo(a, solo_publicadas=False) for a in areas]


@router.post("/contenido/areas", response_model=AreaOut, status_code=status.HTTP_201_CREATED)
def crear_area(datos: AreaIn, alcance: AlcanceMedicos, db: DbSession) -> AreaOut:
    return AreaOut.desde_modelo(contenido.crear_area(db, datos), solo_publicadas=False)


@router.patch("/contenido/areas/{area_id}", response_model=AreaOut)
def actualizar_area(area_id: uuid.UUID, datos: AreaUpdate, alcance: AlcanceMedicos, db: DbSession) -> AreaOut:
    return AreaOut.desde_modelo(contenido.actualizar_area(db, area_id, datos), solo_publicadas=False)


@router.get("/contenido/fichas/{ficha_id}", response_model=FichaOut)
def leer_ficha_admin(ficha_id: uuid.UUID, alcance: AlcanceMedicos, db: DbSession) -> FichaOut:
    ficha = db.get(FichaTecnica, ficha_id)
    if ficha is None:
        raise contenido.ContenidoNoEncontrado()
    return FichaOut.desde_modelo(ficha)


@router.post("/contenido/fichas", response_model=FichaOut, status_code=status.HTTP_201_CREATED)
def crear_ficha(datos: FichaIn, alcance: AlcanceMedicos, db: DbSession) -> FichaOut:
    return FichaOut.desde_modelo(contenido.crear_ficha(db, datos))


@router.patch("/contenido/fichas/{ficha_id}", response_model=FichaOut)
def actualizar_ficha(ficha_id: uuid.UUID, datos: FichaUpdate, alcance: AlcanceMedicos, db: DbSession) -> FichaOut:
    return FichaOut.desde_modelo(contenido.actualizar_ficha(db, ficha_id, datos))


# ---------- documentos de partners (alcance por empresa) ----------


@router.get("/partners/{usuario_id}/documentos", response_model=list[DocumentoOut])
def listar_documentos_partner(usuario_id: uuid.UUID, alcance: AlcanceAdmin, db: DbSession) -> list[DocumentoOut]:
    perfil = _partner_en_alcance(db, alcance, usuario_id)
    return [DocumentoOut.desde_modelo(d) for d in perfil.documentos]


@router.get("/partners/{usuario_id}/documentos/{doc_id}/archivo")
def descargar_documento_partner(
    usuario_id: uuid.UUID, doc_id: uuid.UUID, alcance: AlcanceAdmin, db: DbSession
) -> FileResponse:
    perfil = _partner_en_alcance(db, alcance, usuario_id)
    doc = documentos.documento_de(db, perfil, doc_id)
    return FileResponse(documentos.ruta_absoluta(doc), media_type=doc.content_type, filename=doc.nombre_archivo)


@router.post("/partners/{usuario_id}/documentos/{doc_id}/validar", response_model=DocumentoOut)
def validar_documento(
    usuario_id: uuid.UUID, doc_id: uuid.UUID, datos: DecisionDocumentoIn,
    alcance: AlcanceAdmin, actor: UsuarioActual, db: DbSession,
) -> DocumentoOut:
    perfil = _partner_en_alcance(db, alcance, usuario_id)
    doc = documentos.documento_de(db, perfil, doc_id)
    return DocumentoOut.desde_modelo(documentos.decidir(db, actor, doc, EstadoValidacion.VALIDADO, datos.motivo))


@router.post("/partners/{usuario_id}/documentos/{doc_id}/rechazar", response_model=DocumentoOut)
def rechazar_documento(
    usuario_id: uuid.UUID, doc_id: uuid.UUID, datos: DecisionDocumentoIn,
    alcance: AlcanceAdmin, actor: UsuarioActual, db: DbSession,
) -> DocumentoOut:
    perfil = _partner_en_alcance(db, alcance, usuario_id)
    doc = documentos.documento_de(db, perfil, doc_id)
    return DocumentoOut.desde_modelo(documentos.decidir(db, actor, doc, EstadoValidacion.RECHAZADO, datos.motivo))


@router.get("/partners/{usuario_id}", response_model=PartnerAdminOut)
def leer_partner(usuario_id: uuid.UUID, alcance: AlcanceAdmin, db: DbSession) -> PartnerAdminOut:
    perfil = _partner_en_alcance(db, alcance, usuario_id)
    return PartnerAdminOut.desde_modelo(db.get(Usuario, usuario_id), perfil)
