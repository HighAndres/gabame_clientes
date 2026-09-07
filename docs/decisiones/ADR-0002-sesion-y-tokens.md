# ADR-0002 — Sesion y tokens

- **Fecha:** 2026-09-07
- **Estado:** Aceptado
- **Decide:** Andres Celis (Mirmibug)

## Contexto

Fase 2 necesita sesiones para el portal sin cerrar la puerta al OIDC de Fase 6 (ADR-0001).
El frontend Next y el backend FastAPI son procesos distintos; hay que decidir quien emite,
quien guarda y quien verifica.

## Decision

1. **El backend emite.** `POST /auth/login` devuelve un *access token* JWT (HS256, 30 min) y un
   *refresh token* opaco (14 dias). El JWT lleva los claims OIDC-ready: `sub` (UUID estable),
   `realm`, `roles`, `empresas`, `email_verified`, `typ=access`.
2. **El refresh es rotativo y vive hasheado.** Tabla `sesiones_refresh`: SHA-256 del token,
   vigencia, `revocado_en` y `reemplazada_por_id`. Cada uso lo revoca y emite uno nuevo.
   Presentar un refresh ya rotado se trata como robo: se revocan todas las sesiones del usuario.
   Cambiar la contrasena tambien revoca todas.
3. **Next guarda en cookies httpOnly.** El route handler `/api/sesion` es el unico lugar del
   frontend que ve tokens en claro; los pone en `gabame_session` (access) y `gabame_refresh`
   (refresh), `SameSite=Lax`, `Secure` en produccion. Ningun token toca el JavaScript del navegador.
4. **El middleware verifica la firma localmente** con `jose` y la misma `SECRET_KEY`
   (`JWT_SECRET` en el frontend). Si el access expiro y hay refresh, lo rota contra el backend y
   reescribe las cookies en la misma respuesta. Aplica puertas por prefijo segun `roles`.
5. **El backend sigue siendo la puerta.** El middleware decide que renderizar; cada endpoint
   valida el token y, en el caso del contenido Rx, consulta el estado del perfil medico en BD en
   cada peticion. Un rechazo corta el acceso aunque el access token siga vigente.
6. **Login exige email verificado.** Sin `email_verificado_en` el login responde
   `email_no_verificado`; el usuario puede pedir reenvio. El email es la llave de reconciliacion
   de Fase 6 y no se deja entrar con uno sin confirmar.
7. **El email no se cambia en Fase 2.** `PATCH /usuarios/me` lo ignora. El cambio con
   re-verificacion se disena como pieza aparte.

## Alternativas descartadas

- Que el backend ponga la cookie y el middleware consulte `/usuarios/me` en cada navegacion:
  sin secreto compartido, pero una llamada extra por request y el middleware acoplado a la
  disponibilidad del API.
- Refresh stateless (JWT): sin revocacion real ni deteccion de reutilizacion.

## Consecuencias

- `SECRET_KEY` (backend) y `JWT_SECRET` (frontend) deben ser identicos; se documenta en ambos
  `.env.example`. Ninguno se commitea.
- Cuando llegue Fase 6 el mismo emisor pasa a firmar con RS256 y publicar JWKS; la forma de los
  claims no cambia.
- Los errores del API llevan `detail.codigo` estable para que el frontend decida sin comparar textos.
