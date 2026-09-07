"""Matriz provisional de alcance de los admins (ADR-0004).

# Pendiente 0.2 — el cliente no ha validado la matriz roles x empresas. Esta es la hipotesis
# de trabajo; cuando llegue la definitiva se cambia SOLO este modulo y su espejo
# `frontend/src/lib/matriz-roles.ts`.

Reglas provisionales:
- `admin_grupo` ve y decide sobre todo.
- `admin_empresa` ve y aprueba a los partners cuya `empresa_objetivo` es la suya.
- Los medicos los ve y valida `admin_grupo` y el `admin_empresa` de GABAME, porque el
  contenido tecnico Rx es de GABAME.
- Los pacientes solo los ve `admin_grupo`.
"""

from dataclasses import dataclass, field

from app.core.enums import Empresa, Rol
from app.models import Usuario

# Empresa "duena" de la validacion medica mientras no se decida otra cosa.
EMPRESA_DUENA_MEDICOS = Empresa.GABAME


@dataclass(frozen=True)
class Alcance:
    grupo: bool
    empresas: frozenset[Empresa] = field(default_factory=frozenset)

    @property
    def es_admin(self) -> bool:
        return self.grupo or bool(self.empresas)

    @property
    def ve_medicos(self) -> bool:
        return self.grupo or EMPRESA_DUENA_MEDICOS in self.empresas

    @property
    def ve_pacientes(self) -> bool:
        return self.grupo

    def ve_partner_de(self, empresa: Empresa) -> bool:
        return self.grupo or empresa in self.empresas

    @property
    def empresas_partner(self) -> frozenset[Empresa] | None:
        """None = sin filtro (todas). Conjunto = solo esas empresas."""
        return None if self.grupo else self.empresas


def alcance_de(usuario: Usuario) -> Alcance:
    grupo = usuario.tiene_rol(Rol.ADMIN_GRUPO)
    empresas = frozenset(
        r.empresa for r in usuario.roles if r.rol == Rol.ADMIN_EMPRESA and r.empresa is not None
    )
    return Alcance(grupo=grupo, empresas=empresas)
