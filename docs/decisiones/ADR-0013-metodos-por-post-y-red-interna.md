# ADR-0013 — PUT, PATCH y DELETE viajan dentro de un POST; Next llama al backend por red interna

- **Fecha:** 2026-09-16
- **Estado:** Aceptado
- **Decide:** Andres Celis (Mirmibug)

## Contexto

El portal de staging vive detrás del servidor web de la VPS del cliente, con su firewall de
aplicaciones (OWASP CRS). La regla 911100 solo permite GET, HEAD y POST: cualquier PUT, PATCH o
DELETE muere ahí con un 404 y nunca llega a la aplicación. Medido desde fuera en el portal: GET y
POST al proxy responden 401 (llegan a Next), PUT, PATCH y DELETE responden 404 (no llegan).

Consecuencia: en producción no funcionaban cerrar sesión, guardar Mi cuenta, corregir la
acreditación, publicar o retirar, editar y eliminar publicaciones, guardar roles, requisitos y
espacios, activar cuentas ni retirar documentos. Local y CI pasaban, porque ahí no hay firewall.

Había un segundo camino por el mismo firewall: el servidor de Next llamaba al backend por el dominio
público (`NEXT_PUBLIC_API_URL=https://<dominio>`), así que incluso una llamada de servidor a
servidor salía a internet y volvía a entrar por él. Es también la causa de la respuesta recortada
que se corrigió en el proxy (el servidor web comprimía por su cuenta).

El cliente pidió no tocar ese servidor.

## Decisión

1. **El navegador manda PUT, PATCH y DELETE como POST con el método real en la cabecera
   `x-metodo`** (`src/lib/metodo.ts`). Todo componente cliente llama por `src/lib/peticion.ts`,
   que lo hace solo; nadie usa `fetch` directo contra los route handlers.
2. **Los route handlers restituyen el método** (`metodoEfectivo`) antes de llamar al backend:
   el proxy `/api/backend/*`, `/api/sesion` (cerrar sesión) y `/api/perfil`. El backend no cambia:
   sigue recibiendo PATCH y DELETE de verdad, con su semántica y sus pruebas.
3. **El túnel es estrecho a propósito:** solo se acepta sobre POST (un GET nunca se convierte en
   DELETE, así que un enlace no puede borrar nada) y solo para PUT, PATCH y DELETE. Un formulario de
   otro sitio no puede poner cabeceras propias, y las cookies de sesión son `SameSite=Lax`.
4. **El servidor de Next llama al backend por la red interna** (`API_URL_INTERNA`, en staging
   `http://backend:8000`), vía `src/lib/backend-url.ts`. El navegador sigue usando la URL pública.
   La variable no lleva prefijo `NEXT_PUBLIC`: no llega al navegador.

## Consecuencias

- El portal funciona igual detrás de cualquier servidor web que solo deje pasar GET y POST, sin
  depender de una excepción en su configuración.
- Los métodos directos siguen aceptándose en los route handlers, así que local y las pruebas no
  cambian. Si algún día el servidor del cliente permite los métodos, el túnel sobra pero no estorba.
- Un componente nuevo que use `fetch` directo con PATCH funcionará en local y fallará en el portal.
  La regla es llamar por `lib/peticion.ts`; revisarlo en cada revisión de código.
- Si el cliente decide abrir los métodos en su servidor, esta decisión se puede superseder y
  retirar el túnel; la red interna se queda igual.
