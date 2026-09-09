"""Router: admin. Colas de validacion, usuarios, espacios y contenido. El alcance se resuelve en deps
(ADR-0004 superseded por ADR-0008: vinculos por empresa y modulos por espacio)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import false, func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import (
    AlcanceAdmin,
    DbSession,
    UsuarioActual,
    require_administra_alguna,
    require_alcance_medicos,
    require_contenido_rx,
)
from app.core.enums import Empresa, EstadoValidacion, Modulo, Rol
from app.core.matriz import Alcance
from app.models import (
    AreaTerapeutica,
    FichaTecnica,
    PerfilMedico,
    PerfilPartner,
    Usuario,
    UsuarioRol,
    VinculoEmpresa,
)
from app.schemas.admin import (
    DecisionIn,
    EspacioOut,
    EspacioUpdate,
    MedicoAdminOut,
    PaginaUsuarios,
    PartnerAdminOut,
    ResumenAdmin,
    UsuarioAdminOut,
    VinculoAdminOut,
    VinculoDetalleOut,
)
from app.schemas.contenido import AreaIn, AreaOut, AreaUpdate, FichaIn, FichaOut, FichaUpdate
from app.schemas.partner import DecisionDocumentoIn, DocumentoOut
from app.services import contenido, documentos, espacios, validacion

router = APIRouter()

AlcanceMedicos = Annotated[Alcance, Depends(require_alcance_medicos)]
AlcanceContenido = Annotated[Alcance, Depends(require_contenido_rx)]
AlcanceCuentas = Annotated[Alcance, Depends(require_administra_alguna)]


def _prohibido(mensaje: str) -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, {"codigo": "prohibido", "mensaje": mensaje})


def _filtro_vinculos(alcance: Alcance, q):
    if alcance.empresas_partner is not None:
        q = q.where(VinculoEmpresa.empresa.in_(alcance.empresas_partner))
    return q


# ---------- resumen ----------


@router.get("/resumen", response_model=ResumenAdmin)
def resumen(alcance: AlcanceAdmin, db: DbSession) -> ResumenAdmin:
    pendientes = 0
    if alcance.administra_alguna:
        q = select(func.count()).select_from(VinculoEmpresa).where(VinculoEmpresa.estado == EstadoValidacion.PENDIENTE)
        pendientes = db.scalar(_filtro_vinculos(alcance, q)) or 0

    medicos = None
    if alcance.ve_medicos:
        medicos = db.scalar(
            select(func.count()).select_from(PerfilMedico).where(PerfilMedico.estado == EstadoValidacion.PENDIENTE)
        )
    usuarios = db.scalar(select(func.count()).select_from(Usuario)) if alcance.grupo else None

    return ResumenAdmin(
        medicos_pendientes=medicos,
        partners_pendientes=pendientes,
        usuarios_total=usuarios,
        alcance_grupo=alcance.grupo,
        empresas=sorted(alcance.empresas),
    )


# ---------- espacios ----------


@router.get("/espacios", response_model=list[EspacioOut])
def listar_espacios(alcance: AlcanceAdmin, db: DbSession) -> list[EspacioOut]:
    """Los espacios que el admin puede ver: los que administra o edita."""
    return [
        EspacioOut.desde_modelo(e, administra=alcance.administra(e.empresa), edita=alcance.edita(e.empresa))
        for e in espacios.listar(db)
        if alcance.edita(e.empresa)
    ]


@router.patch("/espacios/{empresa}", response_model=EspacioOut)
def actualizar_espacio(empresa: Empresa, datos: EspacioUpdate, alcance: AlcanceAdmin, db: DbSession) -> EspacioOut:
    if not alcance.edita(empresa):
        raise _prohibido("Sin alcance sobre esta empresa")
    cambios = datos.model_dump(exclude_unset=True)
    if "modulos" in cambios:
        if not alcance.grupo:
            raise _prohibido("Solo el administrador del grupo cambia los modulos")
        cambios["modulos"] = [m.value for m in cambios["modulos"]]
    e = espacios.actualizar(db, empresa, cambios)
    return EspacioOut.desde_modelo(e, administra=alcance.administra(empresa), edita=True)


# ---------- usuarios ----------


def _usuarios_visibles(db: Session, alcance: Alcance):
    """Consulta base de usuarios dentro del alcance del admin."""
    q = select(Usuario)
    if alcance.grupo:
        return q
    condiciones = []
    if alcance.admin:
        condiciones.append(
            Usuario.id.in_(select(VinculoEmpresa.usuario_id).where(VinculoEmpresa.empresa.in_(alcance.admin)))
        )
    if alcance.ve_medicos:
        condiciones.append(Usuario.id.in_(select(PerfilMedico.usuario_id)))
    return q.where(or_(*condiciones)) if condiciones else q.where(false())


@router.get("/usuarios", response_model=PaginaUsuarios)
def listar_usuarios(
    alcance: AlcanceCuentas,
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


# ---------- partners: vinculos ----------


@router.get("/partners", response_model=list[VinculoAdminOut])
def listar_vinculos(
    alcance: AlcanceCuentas,
    db: DbSession,
    estado: EstadoValidacion | None = EstadoValidacion.PENDIENTE,
    empresa: Empresa | None = None,
) -> list[VinculoAdminOut]:
    """Una fila por vinculo usuario-empresa dentro del alcance del admin."""
    q = (
        select(Usuario, PerfilPartner, VinculoEmpresa)
        .join(VinculoEmpresa, VinculoEmpresa.usuario_id == Usuario.id)
        .join(PerfilPartner, PerfilPartner.usuario_id == Usuario.id)
    )
    q = _filtro_vinculos(alcance, q)
    if empresa is not None:
        q = q.where(VinculoEmpresa.empresa == empresa)
    if estado is not None:
        q = q.where(VinculoEmpresa.estado == estado)
    filas = db.execute(q.order_by(VinculoEmpresa.creado_en)).all()
    return [VinculoAdminOut.desde_modelo(u, p, v) for u, p, v in filas]


def _vinculo_en_alcance(db: Session, alcance: Alcance, vinculo_id: uuid.UUID) -> VinculoEmpresa:
    v = db.get(VinculoEmpresa, vinculo_id)
    if v is None:
        raise validacion.PerfilNoEncontrado("No existe ese vinculo.")
    if not alcance.administra(v.empresa):
        raise _prohibido("Sin alcance sobre esta empresa")
    espacios.exigir_modulo(db, v.empresa, Modulo.CUENTAS)
    return v


def _vinculo_admin_out(db: Session, v: VinculoEmpresa) -> VinculoAdminOut:
    u = db.get(Usuario, v.usuario_id)
    return VinculoAdminOut.desde_modelo(u, u.perfil_partner, v)


@router.post("/vinculos/{vinculo_id}/aprobar", response_model=VinculoAdminOut)
def aprobar_vinculo(
    vinculo_id: uuid.UUID, datos: DecisionIn, alcance: AlcanceCuentas, actor: UsuarioActual, db: DbSession
) -> VinculoAdminOut:
    v = _vinculo_en_alcance(db, alcance, vinculo_id)
    return _vinculo_admin_out(db, validacion.aprobar_vinculo(db, actor, v, datos.motivo))


@router.post("/vinculos/{vinculo_id}/rechazar", response_model=VinculoAdminOut)
def rechazar_vinculo(
    vinculo_id: uuid.UUID, datos: DecisionIn, alcance: AlcanceCuentas, actor: UsuarioActual, db: DbSession
) -> VinculoAdminOut:
    v = _vinculo_en_alcance(db, alcance, vinculo_id)
    return _vinculo_admin_out(db, validacion.rechazar_vinculo(db, actor, v, datos.motivo))


# ---------- partners: detalle y documentos ----------


def _partner_en_alcance(db: Session, alcance: Alcance, usuario_id: uuid.UUID) -> Usuario:
    """El admin ve al partner si administra alguna de las empresas con las que tiene vinculo."""
    u = db.get(Usuario, usuario_id)
    if u is None or u.perfil_partner is None:
        raise validacion.PerfilNoEncontrado()
    if not any(alcance.administra(v.empresa) for v in u.vinculos):
        raise _prohibido("Sin alcance sobre esta empresa")
    return u


def _partner_out(db: Session, alcance: Alcance, u: Usuario) -> PartnerAdminOut:
    vinculos = [
        VinculoDetalleOut(
            id=v.id,
            empresa=v.empresa,
            tipo=v.tipo,
            estado=v.estado,
            motivo_rechazo=v.motivo_rechazo,
            aprobado_en=v.aprobado_en,
            creado_en=v.creado_en,
            decidible=alcance.administra(v.empresa) and espacios.obtener(db, v.empresa).tiene(Modulo.CUENTAS.value),
        )
        for v in u.vinculos
    ]
    return PartnerAdminOut.desde_modelo(u, u.perfil_partner, vinculos)


@router.get("/partners/{usuario_id}", response_model=PartnerAdminOut)
def leer_partner(usuario_id: uuid.UUID, alcance: AlcanceCuentas, db: DbSession) -> PartnerAdminOut:
    return _partner_out(db, alcance, _partner_en_alcance(db, alcance, usuario_id))


def _documentos_habilitados(db: Session, alcance: Alcance, u: Usuario) -> None:
    """Revisar documentos exige el modulo `documentos` en alguna empresa que el admin administre."""
    if not any(
        alcance.administra(v.empresa) and espacios.obtener(db, v.empresa).tiene(Modulo.DOCUMENTOS.value)
        for v in u.vinculos
    ):
        raise espacios.ModuloNoHabilitado()


@router.get("/partners/{usuario_id}/documentos", response_model=list[DocumentoOut])
def listar_documentos_partner(usuario_id: uuid.UUID, alcance: AlcanceCuentas, db: DbSession) -> list[DocumentoOut]:
    u = _partner_en_alcance(db, alcance, usuario_id)
    return [DocumentoOut.desde_modelo(d) for d in u.perfil_partner.documentos]


@router.get("/partners/{usuario_id}/documentos/{doc_id}/archivo")
def descargar_documento_partner(
    usuario_id: uuid.UUID, doc_id: uuid.UUID, alcance: AlcanceCuentas, db: DbSession
) -> FileResponse:
    u = _partner_en_alcance(db, alcance, usuario_id)
    doc = documentos.documento_de(db, u.perfil_partner, doc_id)
    return FileResponse(documentos.ruta_absoluta(doc), media_type=doc.content_type, filename=doc.nombre_archivo)


@router.post("/partners/{usuario_id}/documentos/{doc_id}/validar", response_model=DocumentoOut)
def validar_documento(
    usuario_id: uuid.UUID, doc_id: uuid.UUID, datos: DecisionDocumentoIn,
    alcance: AlcanceCuentas, actor: UsuarioActual, db: DbSession,
) -> DocumentoOut:
    u = _partner_en_alcance(db, alcance, usuario_id)
    _documentos_habilitados(db, alcance, u)
    doc = documentos.documento_de(db, u.perfil_partner, doc_id)
    return DocumentoOut.desde_modelo(documentos.decidir(db, actor, doc, EstadoValidacion.VALIDADO, datos.motivo))


@router.post("/partners/{usuario_id}/documentos/{doc_id}/rechazar", response_model=DocumentoOut)
def rechazar_documento(
    usuario_id: uuid.UUID, doc_id: uuid.UUID, datos: DecisionDocumentoIn,
    alcance: AlcanceCuentas, actor: UsuarioActual, db: DbSession,
) -> DocumentoOut:
    u = _partner_en_alcance(db, alcance, usuario_id)
    _documentos_habilitados(db, alcance, u)
    doc = documentos.documento_de(db, u.perfil_partner, doc_id)
    return DocumentoOut.desde_modelo(documentos.decidir(db, actor, doc, EstadoValidacion.RECHAZADO, datos.motivo))


# ---------- contenido Rx (quien edita GABAME y el espacio tiene el modulo) ----------


@router.get("/contenido/areas", response_model=list[AreaOut])
def listar_areas_admin(alcance: AlcanceContenido, db: DbSession) -> list[AreaOut]:
    """Todo, publicado o no: el admin edita; los medicos solo ven lo publicado."""
    areas = db.scalars(select(AreaTerapeutica).order_by(AreaTerapeutica.orden, AreaTerapeutica.nombre)).all()
    return [AreaOut.desde_modelo(a, solo_publicadas=False) for a in areas]


@router.post("/contenido/areas", response_model=AreaOut, status_code=status.HTTP_201_CREATED)
def crear_area(datos: AreaIn, alcance: AlcanceContenido, db: DbSession) -> AreaOut:
    return AreaOut.desde_modelo(contenido.crear_area(db, datos), solo_publicadas=False)


@router.patch("/contenido/areas/{area_id}", response_model=AreaOut)
def actualizar_area(area_id: uuid.UUID, datos: AreaUpdate, alcance: AlcanceContenido, db: DbSession) -> AreaOut:
    return AreaOut.desde_modelo(contenido.actualizar_area(db, area_id, datos), solo_publicadas=False)


@router.get("/contenido/fichas/{ficha_id}", response_model=FichaOut)
def leer_ficha_admin(ficha_id: uuid.UUID, alcance: AlcanceContenido, db: DbSession) -> FichaOut:
    ficha = db.get(FichaTecnica, ficha_id)
    if ficha is None:
        raise contenido.ContenidoNoEncontrado()
    return FichaOut.desde_modelo(ficha)


@router.post("/contenido/fichas", response_model=FichaOut, status_code=status.HTTP_201_CREATED)
def crear_ficha(datos: FichaIn, alcance: AlcanceContenido, db: DbSession) -> FichaOut:
    return FichaOut.desde_modelo(contenido.crear_ficha(db, datos))


@router.patch("/contenido/fichas/{ficha_id}", response_model=FichaOut)
def actualizar_ficha(ficha_id: uuid.UUID, datos: FichaUpdate, alcance: AlcanceContenido, db: DbSession) -> FichaOut:
    return FichaOut.desde_modelo(contenido.actualizar_ficha(db, ficha_id, datos))
