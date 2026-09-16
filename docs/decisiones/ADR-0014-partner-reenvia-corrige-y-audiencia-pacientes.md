# ADR-0014 — El partner reenvía y corrige; la audiencia "pacientes" es de GABAME ID

- **Fecha:** 2026-09-16
- **Estado:** Aceptado (supersede la regla "pacientes = cualquier sesión" de ADR-0009)
- **Decide:** Andres Celis (Mirmibug)

## Contexto

La revisión del rol partner encontró dos callejones sin salida y un problema de audiencia:

- Un vínculo rechazado no tenía salida. Pedirlo otra vez respondía "ya tienes un vínculo con esa
  empresa". Es el mismo caso que ADR-0012 resolvió para la acreditación del médico.
- La razón social y el RFC solo se capturaban al registrarse y no aparecían en ninguna pantalla
  para corregirlos.
- ADR-0009 definió la audiencia "pacientes" como "cualquier sesión". Por eso un distribuidor veía
  en su inicio y en cada espacio contenido pensado para consumidores ("Nuestras marcas y dónde
  encontrarlas").

## Decisión

1. **Volver a solicitar tras un rechazo**: `POST /partners/me/vinculos/{id}/reenviar`. Solo aplica
   sobre un vínculo propio y rechazado. Pasa a `pendiente`, limpia el motivo, permite corregir el
   tipo de relación y deja bitácora (`vinculo_reenviado`, con el motivo anterior). Reenviar no
   aprueba nada: la decisión sigue siendo del admin de esa empresa. Un vínculo ajeno responde igual
   que uno inexistente.
2. **Corregir razón social y RFC**: `PATCH /partners/me`, en Mi cuenta. Se permite mientras ninguna
   empresa haya aprobado un vínculo. Después, esos son los datos que se aprobaron y cambiarlos es un
   trámite con esa empresa, igual que la cédula del médico validado. La bitácora
   (`partner_datos_actualizados`) registra qué campos cambiaron, nunca sus valores. El RFC vacío
   se borra, porque es opcional.
3. **La audiencia "pacientes" es de las cuentas GABAME ID** (pacientes y médicos). Las cuentas del
   realm Partners (partners y administradores) no la reciben. La regla vive en
   `audiencias_permitidas` (deps), así que aplica igual a la lista del espacio, al detalle de una
   publicación (403) y a las novedades del inicio. Los administradores ven todo en el panel.

## Consecuencias

- El admin de una empresa puede recibir de nuevo una solicitud que rechazó. Queda registrado en la
  bitácora con el motivo anterior, y vuelve a decidir con los documentos actualizados.
- Un partner con vínculos solo en revisión puede ver un espacio sin publicaciones. La pantalla lo
  dice una vez, en lugar de mostrar listas vacías.
- Si el grupo quiere publicar algo para todo el mundo, incluidos los partners, hoy tiene que
  crearlo dos veces (pacientes y partners). Si eso se vuelve frecuente, conviene una audiencia
  "todos" en un ADR nuevo.
