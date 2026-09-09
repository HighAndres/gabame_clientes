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
