# Decisiones de arquitectura (ADR)

Un archivo por decision, numerado. Formato corto: Contexto / Decision / Consecuencias.
Una decision no se edita cuando cambia: se escribe un ADR nuevo que la supersede.

| # | Decision | Estado |
|---|---|---|
| 0001 | Modelo de dos realms (GABAME ID / Partners) | Aceptado |
| 0002 | Sesion y tokens (JWT + refresh rotativo, cookies httpOnly en Next) | Aceptado |
| 0003 | Retorno al ecosistema (allowlist de redirect) y captura de origen | Aceptado |
| 0004 | Matriz provisional de alcance de los admins (hasta 0.2) | Provisional |
| 0005 | Contenido Rx como datos con estructura minima (hasta 0.5) | Aceptado |
| 0006 | Documentos de partners: catalogo provisional (hasta 0.4) y disco local | Aceptado |
| 0007 | Salida de local: limites de intentos, cabeceras, i18n, CI, copy sin arquitectura | Aceptado |
| 0008 | Espacios por empresa (modulos como datos) y vinculos usuario-empresa; rol `editor_empresa` | Aceptado (supersede parcialmente 0004 y 0006) |
| 0009 | Administracion por espacio: cuentas administrativas, requisitos como dato, publicaciones por audiencia, bitacora visible | Aceptado (supersede el punto 1 de 0006) |
| 0010 | Una sola forma de decidir permisos: se retiran las dependencias sin uso; el area Partners no exige vinculo aprobado | Aceptado (supersede el punto 3 de 0008 y una mencion de 0004) |
| 0011 | Avisos de acceso: la guarda redirige con un motivo de catalogo cerrado, sin pantalla de error | Aceptado |
| 0012 | El medico ve, corrige y reenvia su acreditacion; las promociones son publicaciones con vigencia y enlace | Aceptado |
