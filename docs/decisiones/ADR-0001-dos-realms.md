# ADR-0001 — Modelo de dos realms

- **Fecha:** 2026-09-06
- **Estado:** Aceptado (confirma el pendiente 0.1 del plan)
- **Decide:** Andres Celis (Mirmibug)

## Contexto

Los 4 sitios corporativos tienen "Portal de clientes" como placeholder. En vez de 4 portales
se construye una plataforma unica que a futuro se vuelve la identidad central del grupo
("Cuenta GABAME"). Hay dos poblaciones con ciclos de vida distintos: personas fisicas
(pacientes y medicos) y empresas (distribuidores, mayoristas, institucionales).

## Decision

Dos realms en una sola plataforma:

- **`id`** — GABAME ID: pacientes/consumidores y medicos validados.
- **`partners`** — GABAME Partners: distribuidores, mayoristas y clientes institucionales.

El realm es un campo del usuario y viaja como claim. Un usuario pertenece a un solo realm.

## Consecuencias

- El esquema de usuario lleva `realm` desde la primera migracion; no hay que migrar identidades en Fase 6.
- Los flujos de onboarding se bifurcan temprano (paciente / profesional de la salud / empresa).
- Los permisos se resuelven por `realm` + `rol` + `empresa`, no por tabla separada por publico.
- **Abierto (0.7):** compradores B2B de las tiendas. Hipotesis de trabajo: van a `partners`
  cuando compran a nombre de una empresa; se resuelve antes de Fase 6.
