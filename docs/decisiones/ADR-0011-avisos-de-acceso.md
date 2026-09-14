# ADR-0011 — Avisos de acceso: por qué te devolvimos, sin pantalla de error

- **Fecha:** 2026-09-13
- **Estado:** Aceptado
- **Decide:** Andres Celis (Mirmibug)

## Contexto

Las guardas del frontend redirigían en silencio. Un paciente que tecleaba `/medico` aparecía en el
inicio sin explicación; un editor que tecleaba `/admin/usuarios` volvía al resumen igual de mudo.
Funcionalmente correcto, porque el permiso lo aplica el backend y ocultar no es permiso, pero
desconcertante: la persona no sabe si se equivocó, si hay una falla o si le falta algo.

La alternativa obvia, una pantalla propia de "sin permiso", tiene dos costos: una ruta más que
mantener y confirmarle a cualquiera qué secciones existen aunque no pueda entrar.

## Decisión

1. **La guarda sigue redirigiendo, pero lleva el motivo.** El middleware devuelve al inicio con
   `?aviso=<motivo>` y la guarda de layout devuelve al resumen del panel con el mismo parámetro.
   No se agrega ninguna ruta.
2. **El texto vive en un catálogo cerrado del código** (`src/lib/avisos-acceso.ts`), nunca en la
   URL. De la URL solo se acepta una clave del catálogo; cualquier otro valor se ignora en
   silencio. Así nadie puede hacer que el portal muestre un mensaje arbitrario con un enlace
   preparado, que es el riesgo obvio de renderizar texto que viene del navegador.
   La comprobación usa `Object.hasOwn` y no el operador `in`: `in` recorre el prototipo, así que
   `constructor` y `__proto__` pasarían por claves válidas. Lo encontró la prueba, no la revisión.
3. **Cada motivo es espejo de una guarda real.** Si se agrega una guarda se agrega su motivo; si se
   retira una, se retira el suyo. Hoy son seis: tres del middleware (área médica, Partners, panel)
   y tres del panel (validación de médicos, contenido Rx, secciones solo de administradores).
4. **El aviso se cierra y limpia la URL.** Al cerrarlo se quita el parámetro con `router.replace`,
   para que recargar o compartir el enlace no lo vuelva a mostrar.

## Consecuencias

- Las dos pantallas de destino (`/dashboard` y `/admin`) leen el parámetro y renderizan el aviso.
  Son los únicos destinos de redirección de guarda, así que no hay que tocar más páginas.
- `exigirAlcance` pasa a recibir el motivo como segundo argumento: una guarda nueva no compila sin
  declarar qué explica.
- Esto es solo comunicación. El permiso se sigue resolviendo en `app/api/deps.py` y en el
  middleware; el aviso no otorga ni quita nada, y por eso puede vivir en el cliente.
- El catálogo es el lugar natural para traducir estos textos cuando se active next-intl.
