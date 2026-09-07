# ADR-0003 — Retorno al ecosistema y captura de origen

- **Fecha:** 2026-09-07
- **Estado:** Aceptado
- **Decide:** Andres Celis (Mirmibug)

## Contexto

Los sitios corporativos y las tiendas enlazan al portal y el portal debe devolver al usuario a
donde venia, sin abrir una redireccion arbitraria. Ademas el grupo quiere saber por que pieza
del ecosistema llego cada persona, sin rastrearla fuera del grupo (LFPDPPP).

## Decision

### Redirect seguro

- Una sola funcion decide destinos: `destinoSeguro()` en `frontend/src/lib/redirect.ts`. La
  usan login, registro, verificar-email y el middleware.
- Acepta rutas internas con una sola `/` inicial y URLs absolutas `https` cuyo host sea exacto o
  subdominio de la allowlist `DOMINIOS_GRUPO` (gabame.com, medinter.com.mx, ordan.com.mx,
  a7siete.com, tiendagabame.com). `http` y `localhost` solo fuera de produccion.
- Todo lo demas (`//host`, `/\`, `javascript:`, credenciales en la URL, hosts ajenos, rutas de
  auth) cae a `/dashboard` **sin avisar**. No hay redirecciones abiertas.
- Para sobrevivir al paso de verificacion de email, el destino ya validado se guarda en la cookie
  `gabame_redirect` (30 min), no en el enlace del correo.
- **Pendiente 0.6:** Aurashop entra a la allowlist cuando tenga dominio documentado.

### Origen

- Las piezas enlazan con `?origen=<producto>&ruta=<path>&campana=<texto>`. `producto` debe ser
  un valor del enum `Producto`; `ruta` un path interno sin host, query ni fragmento.
- Registro: escribe `usuarios.origen_inicial` una sola vez y **siempre** agrega una fila
  `registro` en `origenes_usuario` (con `directo` si no vino de ninguna pieza).
- Login con origen agrega fila `login`. Usuario con sesion que vuelve con origen agrega fila
  `retorno` via `POST /usuarios/me/origen`. Login sin origen no escribe nada.
- Nada se sobrescribe. La tabla es la fuente de verdad; `origen_inicial` es comodidad.
- Ni el schema ni la tabla conocen IP, user agent, referrer completo ni huella. Si el cliente los
  manda, se ignoran. Una prueba automatizada verifica que ninguna tabla tenga columnas de rastreo.

## Consecuencias

- Los sitios del grupo solo necesitan armar un enlace; no hay integracion tecnica.
- Agregar una pieza nueva al ecosistema es: valor en `Producto` (backend y espejo TS) y, si
  tiene dominio propio, entrada en `DOMINIOS_GRUPO`.
