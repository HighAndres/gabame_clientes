# ADR-0009 — Administración por espacio: cuentas administrativas, requisitos como dato, publicaciones por audiencia y bitácora visible

- **Fecha:** 2026-09-09
- **Estado:** Aceptado. Supersede el punto 1 de ADR-0006 (catálogo de requisitos en código)
- **Decide:** Andres Celis (Mirmibug)

## Contexto

Con los espacios y vínculos de ADR-0008, cada empresa administra lo suyo. Faltaba que pudiera
hacerlo desde el panel sin tocar código: dar de alta a sus admins y editores, decidir qué
documentos pide a sus partners, publicar contenido para sus audiencias y ver quién hizo qué.

## Decisión

1. **Cuentas administrativas desde el panel.** `POST /admin/usuarios` crea un admin o editor
   dentro del alcance del actor: `admin_grupo` asigna cualquier rol; `admin_empresa` solo
   `admin_empresa` y `editor_empresa` de sus empresas; los editores no administran cuentas. La
   cuenta nace sin contraseña conocida y recibe por correo el enlace de restablecimiento, que
   además confirma el correo. `PUT /admin/usuarios/{id}/roles` deja los roles administrativos
   como se piden, pero **solo toca los que están en el alcance del actor**; los demás se
   conservan. Los roles de persona (paciente, médico, partner) nunca se asignan desde el panel.
   Nadie se retira a sí mismo `admin_grupo` ni se desactiva a sí mismo. Desactivar revoca todas
   las sesiones. Ningún admin ve ni fija contraseñas: solo envía el enlace.
2. **Requisitos documentales como dato.** Tabla `requisitos_documentales` por empresa (clave,
   nombre, indicación, obligatorio, tipo de partner al que aplica o todos, orden, activo). El
   catálogo genérico de `app/core/requisitos_partner.py` solo siembra un espacio vacío. El
   partner ve la unión de los requisitos activos de las empresas con las que tiene vínculo,
   filtrados por su tipo; los documentos siguen siendo de la razón social y una clave compartida
   es un solo documento. Retirar un requisito lo **desactiva**, no lo borra: los documentos ya
   cargados conservan su etiqueta. Editarlos exige administrar la empresa y el módulo
   `documentos`. Esto resuelve el pendiente 0.4 como dato: cuando el cliente entregue su
   lista, se captura desde el panel.
3. **Publicaciones por audiencia.** Tabla `publicaciones` por empresa con `audiencia`
   (`pacientes`, `medicos`, `partners`), slug, título, resumen, contenido markdown, orden y
   `publicada`. Quien edita la empresa (admin o editor) las administra. La lectura
   (`GET /espacios/{empresa}/publicaciones/{audiencia}`) pasa por `acceso_audiencia` en
   `deps.py`: pacientes = cualquier sesión; médicos = **la misma puerta** que el contenido Rx
   (`require_medico_validado`); partners = vínculo aprobado con **esa** empresa. El contenido
   técnico Rx sigue en `fichas_tecnicas` con su puerta propia: las publicaciones son
   información institucional y comercial, nunca clínica.
4. **Bitácora visible.** `GET /admin/bitacora` lista `bitacora_validacion` con actor y
   objetivo resueltos, filtrable por objetivo, dentro del alcance (el `admin_grupo` ve todo;
   un `admin_empresa` solo lo que toca a usuarios de su alcance). Las acciones nuevas de este
   corte también escriben ahí: `usuario_creado`, `roles_actualizados`, `usuario_activado`,
   `usuario_desactivado`, `restablecimiento_enviado`. La bitácora no se edita ni se borra.
5. **Frontend.** Secciones nuevas del panel con guardas de layout: Publicaciones y Espacios
   (admins y editores), Usuarios con alta y detalle, Bitácora (solo admins). Las casillas de
   roles muestran únicamente lo que el actor puede asignar.

## Consecuencias

- La lista de usuarios de un `admin_empresa` ahora incluye a los admins y editores de sus
  empresas, además de sus partners.
- `GET /espacios` expone nombre, módulos y portal de cada espacio a cualquier sesión; el
  contacto comercial solo viaja dentro del vínculo aprobado (`/partners/me`).
- Corte 4 consume `GET /espacios` y las publicaciones para las vistas por empresa de paciente,
  médico y partner.
