"""Alcance de admins y editores por empresa (ADR-0008, supersede la matriz provisional de ADR-0004).

# Pendiente 0.2 — el cliente no ha validado la matriz roles x empresas. Esta es la hipotesis
# de trabajo; cuando llegue la definitiva se cambia SOLO este modulo y su espejo
# `frontend/src/lib/matriz-roles.ts`. Lo que cada espacio tiene habilitado es DATO (`espacios.modulos`).

Reglas:
- `admin_grupo` administra y edita todas las empresas.
- `admin_empresa` administra su empresa: aprueba vinculos, revisa documentos, edita contenido y
  contactos.
- `editor_empresa` edita contenido y contactos de su empresa; no aprueba ni ve documentos.
- Los medicos los ve y valida quien administra GABAME (el contenido Rx es de GABAME). El
  contenido Rx lo edita quien edita GABAME.
- Los pacientes solo los ve `admin_grupo`. Esa regla no es una propiedad de `Alcance`: la aplica
  `_usuarios_visibles` en el router de admin, que es el unico listado donde aparecen (ADR-0010).
"""

from dataclasses import dataclass, field

from app.core.ecosistema import empresa_de
from app.core.enums import Empresa, Rol
from app.models import Usuario

# Empresa "duena" del modulo medico mientras no se decida otra cosa.
EMPRESA_DUENA_MEDICOS = Empresa.GABAME

# Sitio ancla del grupo: lo que ve quien llego al portal sin pasar por ninguna otra pieza.
EMPRESA_ANCLA = Empresa.GABAME


@dataclass(frozen=True)
class Alcance:
    grupo: bool
    admin: frozenset[Empresa] = field(default_factory=frozenset)
    editor: frozenset[Empresa] = field(default_factory=frozenset)

    @property
    def es_admin(self) -> bool:
        """Entra al panel de administracion (aunque sea solo como editor)."""
        return self.grupo or bool(self.admin) or bool(self.editor)

    @property
    def empresas(self) -> frozenset[Empresa]:
        """Empresas visibles en el panel."""
        return frozenset(Empresa) if self.grupo else self.admin | self.editor

    def administra(self, empresa: Empresa) -> bool:
        """Aprobar vinculos, revisar documentos, ver usuarios de esa empresa."""
        return self.grupo or empresa in self.admin

    def edita(self, empresa: Empresa) -> bool:
        """Editar contenido y contactos del espacio de esa empresa."""
        return self.grupo or empresa in self.admin or empresa in self.editor

    @property
    def administra_alguna(self) -> bool:
        return self.grupo or bool(self.admin)

    @property
    def ve_medicos(self) -> bool:
        return self.administra(EMPRESA_DUENA_MEDICOS)

    @property
    def edita_contenido_rx(self) -> bool:
        return self.edita(EMPRESA_DUENA_MEDICOS)

    @property
    def empresas_partner(self) -> frozenset[Empresa] | None:
        """Filtro de vinculos que puede aprobar: None = todas; conjunto = solo esas."""
        return None if self.grupo else self.admin


def empresas_visibles(usuario: Usuario) -> frozenset[Empresa]:
    """Que empresas del grupo existen para esta persona dentro del portal (ADR-0015).

    Solo el administrador del grupo ve las cuatro; cualquier otra cuenta ve unicamente aquellas
    con las que tiene algo que ver:

    - administradores y editores: las de su alcance;
    - partner: aquellas con las que tiene vinculo, en el estado que sea (si no, no podria ver
      en que va su solicitud);
    - medico: GABAME, duena del area medica y de Farmacias GABAME;
    - paciente: aquellas por las que entro al portal, segun su historial de origenes. Quien
      llego directo, sin pasar por ningun sitio del grupo, ve GABAME, que es el sitio ancla.

    No es una regla de secreto —lo que se publica para pacientes es institucional— sino de
    pertinencia: a un consumidor que llego por Ordan no le habla el espacio de A7.
    """
    alcance = alcance_de(usuario)
    if alcance.es_admin:
        return alcance.empresas

    visibles: set[Empresa] = {v.empresa for v in usuario.vinculos}
    if usuario.tiene_rol(Rol.MEDICO):
        visibles.add(EMPRESA_DUENA_MEDICOS)
    if usuario.tiene_rol(Rol.PACIENTE):
        visibles |= {e for e in (empresa_de(o.producto) for o in usuario.origenes) if e is not None}
        inicial = empresa_de(usuario.origen_inicial)
        if inicial is not None:
            visibles.add(inicial)
        if not visibles:
            visibles.add(EMPRESA_ANCLA)
    return frozenset(visibles)

def alcance_de(usuario: Usuario) -> Alcance:
    grupo = usuario.tiene_rol(Rol.ADMIN_GRUPO)
    admin = frozenset(r.empresa for r in usuario.roles if r.rol == Rol.ADMIN_EMPRESA and r.empresa is not None)
    editor = frozenset(r.empresa for r in usuario.roles if r.rol == Rol.EDITOR_EMPRESA and r.empresa is not None)
    return Alcance(grupo=grupo, admin=admin, editor=editor)
