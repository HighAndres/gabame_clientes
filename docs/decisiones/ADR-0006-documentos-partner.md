# ADR-0006 — Documentos de partners: catalogo provisional y almacenamiento local

- **Fecha:** 2026-09-07
- **Estado:** Aceptado. El catalogo de requisitos lo supersede lo que defina el cliente (pendiente 0.4)
- **Decide:** Andres Celis (Mirmibug)

## Contexto

Fase 5 pide carga de documentacion por subtipo de partner y cola de aprobacion, pero el cliente
no ha definido los requisitos por subtipo (0.4) ni entregado contactos comerciales ni URLs de
portales operativos. Habia que dejar el flujo completo sin inventar el criterio.

## Decision

1. **Catalogo provisional en un solo modulo.** `app/core/requisitos_partner.py` define los
   requisitos por `SubtipoPartner`. Hoy son los tres documentos genericos de un alta comercial
   en Mexico (constancia de situacion fiscal, identificacion del representante, comprobante de
   domicilio) mas "otro", iguales para los tres subtipos. `documentos_partner.tipo` guarda la
   clave del catalogo y el backend rechaza claves fuera de el.
2. **Archivos fuera del repo.** Disco local en `UPLOADS_DIR` (gitignored) con nombre aleatorio
   `partners/<usuario_id>/<uuid>.<ext>`; el nombre original se guarda saneado solo como metadato.
   Solo PDF, JPG y PNG, hasta `UPLOAD_MAX_MB`. El almacenamiento definitivo se decide en Fase 7.
3. **Quien ve que.** El partner ve y descarga solo lo suyo y puede retirar unicamente documentos
   sin revisar. El admin ve, descarga y decide sobre documentos de partners dentro de su alcance
   (ADR-0004). Cada decision escribe en `bitacora_validacion` con `documento_id`, tipo, estado
   anterior, nuevo y motivo. Rechazar exige motivo.
4. **La cuenta se aprueba aparte de los documentos.** Aprobar documentos no aprueba la cuenta:
   el admin decide la cuenta con la cola ya existente. Contactos comerciales y portales
   operativos solo se muestran con cuenta aprobada, y hoy son placeholders (`CONTACTOS`) hasta
   que el cliente los entregue.
5. **Sin contenido clinico.** Una prueba fija el conjunto exacto de columnas de
   `documentos_partner`.

## Consecuencias

- Cuando llegue 0.4 se edita `requisitos_partner.py` y, si cambian los textos, el diccionario
  `TIPO` de la vista admin. Los documentos ya cargados conservan su clave.
- El proxy `/api/backend/*` del frontend reenvia multipart y devuelve archivos: los componentes
  cliente suben y descargan sin ver el token.
