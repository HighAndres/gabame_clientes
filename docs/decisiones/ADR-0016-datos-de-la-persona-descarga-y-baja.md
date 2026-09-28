# ADR-0016 — Los datos de la persona: descargarlos y dar de baja la cuenta

- **Fecha:** 2026-09-27
- **Estado:** Aceptado
- **Decide:** Andres Celis (Mirmibug)

## Contexto

El aviso de privacidad de la Cuenta GABAME dice que los derechos ARCO se ejercen "escribiendo al
contacto que el grupo publicará en el aviso definitivo". Ese contacto todavía no existe, así que en
la práctica la persona solo podía **rectificar** (editar sus datos en Mi cuenta): no podía obtener
copia de lo suyo ni pedir que se diera de baja su cuenta.

Los dos derechos que el portal puede resolver por sí mismo son acceso y cancelación. El tercero
—oposición— depende de qué comunicaciones decida enviar el grupo, y hoy solo existen las
transaccionales.

## Decisión

1. **Descargar mis datos** (`GET /usuarios/me/datos`): un archivo JSON con todo lo que esta
   plataforma guarda de esa persona —cuenta, roles, cómo llegó al portal, acreditación, empresa,
   vínculos, ficha de sus documentos y los movimientos sobre su cuenta—. Incluye su **cédula
   profesional completa**: enmascararla tiene sentido en una pantalla, no cuando el titular pide
   sus propios datos. No incluye datos de terceros: la bitácora va sin el nombre de quien decidió.
2. **Dar de baja la cuenta** (`POST /usuarios/me/baja`), en dos pasos:
   - La persona la solicita y **su acceso se cierra en el acto**: la cuenta queda inactiva y sus
     sesiones se revocan. Su decisión no espera a nadie. El motivo es opcional: nadie tiene que
     justificarse.
   - **El borrado lo confirma un administrador** con alcance sobre esa cuenta
     (`DELETE /admin/usuarios/{id}`, solo sobre cuentas que ya pidieron su baja). Detrás hay
     documentos fiscales, vínculos aprobados por una empresa y una bitácora que es requisito;
     cuánto de eso debe conservarse, y por cuánto tiempo, lo define el cliente. Borrar sin esa
     definición sería decidirlo nosotros.
3. **La bitácora sobrevive al borrado.** `bitacora_validacion.objetivo_id` no es llave foránea y el
   actor queda en nulo, así que el registro de qué pasó y cuándo permanece sin los datos de la
   persona. Al borrar se retira además el motivo que ella escribió: es lo único de esa fila que es
   suyo.
4. **Puede pedirla cualquier cuenta**, incluido un partner. Es un derecho de la persona, no del rol;
   el administrador ve el caso y decide qué hacer con vínculos y documentos antes de borrar.

## Consecuencias

- Una baja deja a una empresa sin su contacto en el portal. El administrador lo ve en su panel
  (filtro "Bajas solicitadas") y puede hablar con esa empresa antes de borrar.
- Mientras el grupo no publique sus buzones, las pantallas usan contactos provisionales
  centralizados en `src/legal/contactos.ts`. Se sustituyen ahí, no pantalla por pantalla.
- Falta el derecho de oposición: depende de que el cliente defina qué comunicaciones enviará. Si
  algún día hay correos que no sean transaccionales, hace falta una preferencia y un ADR nuevo.
- El aviso de privacidad sigue siendo provisional; cuando llegue el definitivo conviene que
  mencione estas dos rutas dentro del producto, además del buzón.
