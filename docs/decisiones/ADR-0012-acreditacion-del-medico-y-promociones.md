# ADR-0012 — El médico administra su acreditación; las promociones son publicaciones

- **Fecha:** 2026-09-15
- **Estado:** Aceptado
- **Decide:** Andres Celis (Mirmibug)

## Contexto

El rol `medico` es el crítico del proyecto y el único con ciclo de vida propio, pero hasta ahora ese
ciclo lo vivía el administrador y no el médico. Su cédula se guardaba y nadie se la mostraba: no
podía confirmar con qué dato quedó registrado ni corregir un dígito mal tecleado, y un rechazo lo
dejaba fuera para siempre, sin motivo visible y sin camino de vuelta. El área médica, además, está
vacía hasta que el cliente entregue el contenido Rx (pendiente 0.5), así que un profesional validado
entraba a una sección sin nada.

El cliente definió el alcance real del perfil: el médico ve lo del grupo y lo de Farmacias GABAME,
con una sección de promociones de la tienda y, más adelante, un salto a la app médico-paciente
(MB-V005). Farmacias GABAME vive hoy en un entorno de pruebas y mañana en su dominio definitivo.

## Decisión

1. **El médico ve y corrige su propia acreditación**, en Mi cuenta, por
   `GET/PATCH /medicos/me/acreditacion` y `POST .../reenviar`. La puerta es
   `require_perfil_medico`: rol médico con perfil, en **cualquier** estado. Va en un router aparte
   del contenido Rx precisamente porque ahí tienen que entrar los que **no** están validados, que
   son quienes necesitan corregir algo. No abre ningún contenido técnico, y una prueba lo fija.
2. **La cédula sale siempre enmascarada**, también para su dueño: los últimos dígitos, nunca más de
   la mitad, y nada por debajo de seis caracteres. Le basta reconocerla. Es dato personal sensible:
   no se loguea, no viaja en el token y no entra en la bitácora, que registra qué campos se tocaron
   y no su contenido.
3. **La cédula se edita mientras la acreditación no esté validada.** Una vez validada, cambiarla es
   trámite con el equipo del grupo, no un formulario. Especialidad e institución quedan libres.
4. **Un rechazo deja de ser el final del camino:** el médico ve el motivo, corrige y reenvía; el
   perfil vuelve a `pendiente` y a la cola del administrador, con registro en `bitacora_validacion`.
   Reenviar **no** valida nada: la puerta del contenido sigue siendo el estado `validado`.
5. **Las promociones de Farmacias GABAME son publicaciones del espacio de GABAME para la audiencia
   de médicos**, capturadas en el panel. No se leen de la tienda: esta plataforma no consulta su
   base de datos (regla 2). Una publicación gana dos campos opcionales:
   - `vigencia_hasta`, porque una promoción sin fecha de fin se queda colgada para siempre. Vencida
     deja de servirse sola, en la lista y en el detalle, pero no se borra: el admin la ve marcada
     para renovarla o retirarla. Nula = publicación institucional de siempre.
   - `url_externa`, porque lo que se anuncia vive en la tienda. Es una URL que teclea una persona y
     que el portal enlaza con la marca del grupo detrás, así que se valida contra una allowlist
     (`app/core/dominios.py`, espejo de `dominios-grupo.ts`) que exige `https` y acepta el host o
     sus subdominios. La regla vive en el servicio y no en el esquema, para responder con un código
     que el panel sepa explicar.
6. **La URL de la tienda es configuración** (`URL_FARMACIAS`), no código, y su host entra solo a la
   allowlist. Mover Farmacias GABAME de dominio no exige tocar el catálogo ni la lista de destinos.
7. **El botón a la app médico-paciente aparece solo cuando exista su URL** en el catálogo del
   ecosistema. Mientras tanto se anuncia como próximamente, sin enlace muerto.

## Consecuencias

- El administrador ya no es el único camino para corregir un dato: baja la cola de soporte y el
  médico rechazado tiene salida propia. La decisión de validar sigue siendo suya y solo suya.
- `require_perfil_medico` y `require_medico_validado` conviven y es fácil confundirlas. La primera
  solo abre la acreditación propia; cualquier endpoint de contenido Rx usa la segunda (ADR-0010).
- Las publicaciones tienen ahora dos usos: comunicado institucional y promoción. Las distingue el
  dato, no una tabla nueva. Si el cliente pide segmentar promociones por otro eje (una tienda
  distinta, por ejemplo), esta decisión se supersede.
- El contacto de acreditaciones que ve el médico es un placeholder hasta que el cliente cierre el
  pendiente 0.3 con el criterio de validación y su buzón real.
