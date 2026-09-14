# ADR-0008 — Espacios por empresa y vinculos usuario-empresa

- **Fecha:** 2026-09-09
- **Estado:** Aceptado. Supersede parcialmente ADR-0004 (el alcance de admins) y el punto 4 de
  ADR-0006 (contactos como placeholder en codigo). La matriz sigue siendo provisional hasta 0.2.
  ADR-0010 supersede el punto 3 en lo que dice de `require_partner_aprobado`: esa dependencia no
  existe, el area Partners esta abierta a cualquier partner con perfil y el vinculo aprobado se
  exige por empresa en el detalle, no por cuenta en la entrada
- **Decide:** Andres Celis (Mirmibug)

## Contexto

El cliente pidio que cada empresa del grupo tenga su propio portal de clientes dentro de la
plataforma, con cosas distintas por empresa, y que un partner pueda relacionarse con mas de una
empresa. El modelo de Fase 3-5 guardaba una sola `empresa_objetivo` y un solo `estado` en
`perfiles_partner`, y los contactos comerciales vivian como constantes en codigo. Ninguna de las
dos cosas escala a "cada empresa administra lo suyo".

## Decision

1. **Espacios como datos.** Tabla `espacios`, una fila por `Empresa`: nombre, `modulos`
   habilitados (lista JSONB de `Modulo`: `cuentas`, `documentos`, `contactos`, `contenido_rx`),
   contacto comercial y portal operativo. Lo que un espacio no tiene habilitado no existe para esa
   empresa: el backend responde 403 `modulo_no_habilitado`. Los valores por defecto viven en
   `app/services/espacios.py` y la fila se crea al primer uso si falta. Que hace cada portal de
   empresa se define despues con el cliente; hoy los modulos son los cuatro que ya existian.
2. **Vinculos usuario-empresa.** Tabla `vinculos_empresa` (`usuario_id`, `empresa`, `tipo`
   SubtipoPartner, `estado`, `aprobado_por_id`, `aprobado_en`, `motivo_rechazo`; unico por
   usuario y empresa). Un partner puede estar aprobado con Ordan y en revision con A7. Cada
   vinculo lo aprueba o rechaza el admin de esa empresa, con bitacora `vinculo_<estado>` y correo
   al partner nombrando la empresa. `perfiles_partner` conserva solo lo que es de la razon social
   (`razon_social`, `rfc`). Los documentos siguen siendo de la razon social: los revisa cualquier
   admin de una empresa vinculada, si esa empresa tiene el modulo `documentos`.
3. **Registro y solicitud.** Al registrarse, una empresa elige al menos una empresa del grupo y
   el tipo de relacion con cada una. Despues puede pedir vinculo con otra desde su area
   (`POST /partners/me/vinculos`); nace `pendiente`. `require_partner_aprobado` exige al menos un
   vinculo `validado`.
4. **Rol `editor_empresa`.** Edita contenido y contactos de su empresa; no aprueba cuentas, no
   ve usuarios ni documentos. El alcance (`app/core/matriz.py`) pasa a tres conjuntos: `grupo`,
   `admin` (empresas que administra) y `editor` (empresas que solo edita). Los medicos los ve
   quien administra GABAME; el contenido Rx lo edita quien edita GABAME y solo si el espacio de
   GABAME tiene `contenido_rx`.
5. **Permisos siguen en un solo lugar.** Backend: `deps.py` (`require_administra_alguna`,
   `require_contenido_rx`, `require_alcance_medicos`) mas `espacios.exigir_modulo` en el servicio.
   Frontend: `src/lib/matriz-roles.ts` decide que se renderiza y `src/lib/guardas.ts` protege las
   secciones del panel por layout; el backend rechaza igual.
6. **Migracion con backfill.** `20260909_0900_adr0008_espacios_y_vinculos` crea las tablas,
   agrega `editor_empresa` al enum `rol`, convierte cada perfil existente en un vinculo con su
   `empresa_objetivo` y elimina las columnas viejas. El downgrade conserva un vinculo por partner
   (el aprobado si lo hay) y deja el valor del enum, porque Postgres no permite quitarlo.

## Consecuencias

- La marca sigue siendo la del grupo (CLAUDE.md): cada espacio solo aporta nombre y contacto,
  nunca paleta ni logotipo propio.
- El copy del partner habla de "empresas con las que trabajas"; nunca de la arquitectura de
  identidad (ADR-0007).
- La captura de contactos, portales y modulos desde el panel (`GET/PATCH /admin/espacios`) ya
  existe en el backend; la pantalla llega en el siguiente corte junto con la gestion de usuarios
  y roles.
- Cuando el cliente valide 0.2 se ajustan solo `matriz.py` y `matriz-roles.ts`; cuando defina que
  hace cada portal, se agregan modulos al enum `Modulo` y a `MODULOS_POR_DEFECTO`.
