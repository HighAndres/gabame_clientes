# ADR-0004 — Matriz provisional de alcance de los admins

- **Fecha:** 2026-09-07
- **Estado:** Aceptado como provisional. Lo supersede la matriz que valide el cliente (pendiente 0.2)
- **Decide:** Andres Celis (Mirmibug)

## Contexto

Fase 3 necesita que los admins vean usuarios y aprueben perfiles, pero el cliente no ha validado
la matriz roles x empresas (0.2). Pacientes y medicos no pertenecen a una empresa; los partners
si (`empresa_objetivo`). Habia que decidir una regla para no bloquear la fase.

## Decision

Regla provisional, en un solo modulo por lado (`backend/app/core/matriz.py` y
`frontend/src/lib/matriz-roles.ts`):

| Poblacion | `admin_grupo` | `admin_empresa` |
|---|---|---|
| Partners | todos | solo los de su `empresa_objetivo` |
| Medicos | ve y valida | solo el de **GABAME** ve y valida (el contenido Rx es de GABAME) |
| Pacientes | ve | no ve |

- El alcance se resuelve en `deps.py` (`get_alcance_admin`, `require_alcance_medicos`,
  `require_alcance_pacientes`), nunca en handlers. El frontend solo usa su espejo para decidir
  que renderizar.
- Toda transicion (validar/rechazar medico, aprobar/rechazar partner) escribe en
  `bitacora_validacion` con actor, estado anterior, nuevo y motivo, y manda correo al afectado.
  El rechazo exige motivo. Repetir la misma transicion devuelve 409.
- La cedula profesional aparece en la vista admin de medicos porque es lo que se valida. No es
  respuesta publica: solo la reciben admins con alcance sobre medicos, y nunca va a bitacora ni logs.
- El criterio de validacion medica sigue aislado en `validacion_medica.py` (pendiente 0.3); este
  ADR solo decide **quien** aplica la decision.

## Alternativa descartada

Que cada `admin_empresa` vea a todo usuario cuyo `origen_inicial` sea su empresa. Mezcla un dato
de marketing con permisos y se rompe cuando la persona vuelve por otra pieza del ecosistema.

## Consecuencias

- Cuando llegue 0.2 se cambia `matriz.py`, su espejo TS y las pruebas de `test_admin.py`; nada mas.
- El catalogo de piezas del ecosistema (`app/core/ecosistema.py`) se expone por realm en
  `GET /ecosistema`; las URLs que faltan (Aurashop, portales operativos) las entrega el cliente.
