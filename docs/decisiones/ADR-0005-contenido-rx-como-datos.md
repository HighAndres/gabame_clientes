# ADR-0005 — Contenido Rx como datos con estructura minima

- **Fecha:** 2026-09-07
- **Estado:** Aceptado. La estructura de la ficha se completa cuando el cliente entregue 0.5
- **Decide:** Andres Celis (Mirmibug)

## Contexto

Fase 4 pide fichas tecnicas del portafolio Rx por area terapeutica, pero el cliente no ha
entregado ni el contenido ni su estructura (0.5), ni ha validado el uso del "Acordeon del
Control Gabame". Habia que construir el area medica sin inventar campos ni datos.

## Decision

1. **El contenido es dato, no codigo.** Tablas `areas_terapeuticas` y `fichas_tecnicas`, con
   `slug` estable, `orden` y bandera `publicada`. Se cargan desde el portal por el admin de
   contenido, no por migraciones.
2. **Estructura minima a proposito.** Una ficha es `nombre`, `resumen` y `contenido` en markdown.
   No se inventan campos (indicaciones, presentaciones, etc.): cuando 0.5 los defina, se agregan
   con su migracion y el markdown existente se migra o se conserva como cuerpo.
3. **Solo publicado, solo validados.** Los endpoints `/medicos/*` cuelgan todos de
   `require_medico_validado` (dependencia a nivel de router) y sirven unicamente areas y fichas
   con `publicada = true`. Retirar un area oculta sus fichas.
4. **Quien edita.** El mismo alcance que valida medicos (ADR-0004): `admin_grupo` y el
   `admin_empresa` de GABAME. Los endpoints de edicion viven en `/admin/contenido/*`.
5. **Sin pacientes.** Las tablas de contenido no tienen relacion con usuarios ni pacientes; una
   prueba lo verifica junto con la de columnas clinicas.
6. **Render seguro.** El frontend renderiza markdown con react-markdown sin HTML crudo.

## Consecuencias

- El area medica queda funcional y vacia: el cliente ve exactamente el flujo que tendran los
  medicos y puede empezar a capturar cuando libere contenido.
- Los datos del Acordeon interno siguen sin usarse hasta que el cliente los valide.
