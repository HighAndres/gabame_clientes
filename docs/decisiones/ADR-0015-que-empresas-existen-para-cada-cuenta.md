# ADR-0015 — Qué empresas del grupo existen para cada cuenta

- **Fecha:** 2026-09-27
- **Estado:** Aceptado (supersede el alcance implícito de ADR-0009 y ADR-0014 para el portal)
- **Decide:** Andres Celis (Mirmibug)

## Contexto

Hasta ahora, cualquier persona con sesión veía las cuatro empresas del grupo en el portal y lo que
cada una publicara para su audiencia. Eso convertía al portal en un directorio del grupo para todo
el mundo: a un consumidor que llegó por Ordan se le mostraba el espacio de A7, que vende logística
y distribución, y a un médico se le ofrecían marcas que no tienen que ver con su acreditación.

El cliente fijó dos reglas básicas:

1. **Solo el administrador general ve todas las empresas** y lo relacionado con ellas.
2. **Las únicas que van juntas son GABAME y Farmacias GABAME.** La tienda no es una empresa del
   grupo: es un producto de GABAME, y se presentan como una sola cosa.

## Decisión

Una sola función, `empresas_visibles` en `app/api/deps.py`, decide qué empresas existen para una
cuenta dentro del portal. Todas las puertas la usan: la lista de espacios, el detalle de uno, sus
publicaciones (por `audiencias_permitidas`) y el catálogo del ecosistema.

| Cuenta | Empresas que ve |
|---|---|
| Administrador del grupo | Las cuatro |
| Administrador o editor de empresa | Las de su alcance |
| Partner | Aquellas con las que tiene vínculo, **en el estado que sea** |
| Médico | GABAME, dueña del área médica y de Farmacias GABAME |
| Paciente | Aquellas por las que entró al portal, según su historial de orígenes |

Detalles que sostienen la tabla:

- **El paciente se acota por su origen**, que ya se registra como historial append-only. Los
  orígenes **se acumulan**: quien llegó por Ordan y más tarde volvió desde gabame.com ve las dos.
  Nadie pierde un espacio que ya tenía.
- **Quien llegó directo**, sin pasar por ningún sitio del grupo, ve GABAME: es el sitio ancla.
- **Una tienda cuenta como su empresa.** Entrar por Farmacias GABAME es entrar por GABAME; entrar
  por Aurashop es entrar por Ordan. La pieza del ecosistema que no es de ninguna empresa (la app de
  paciente) se muestra siempre.
- **El vínculo rechazado no se retira** del alcance del partner: es donde ve el motivo y desde donde
  vuelve a solicitar (ADR-0014).

Esto **no es una regla de secreto**: lo que se publica para pacientes es institucional. Es una regla
de pertinencia, y por eso responde 403 y no 404.

## Consecuencias

- El portal deja de ser un directorio del grupo: cada persona ve la parte que le toca. Eso refuerza
  la indicación de no hacerle sentir que entró a un producto distinto del que venía.
- Un partner ya no ve el espacio de GABAME salvo que tenga vínculo con GABAME.
- Un paciente que llegó por Ordan ve Ordan y Aurashop, la tienda de Ordan. Si el cliente prefiere
  que Aurashop no se ofrezca junto a ningún otro sitio, es un cambio de una línea en el catálogo.
- Las pruebas que daban por hecho el alcance anterior se actualizaron; `test_alcance_portal.py`
  fija la regla nueva por las cuatro puertas.
- Pendiente 0.2 sigue abierto: el reparto entre admins y editores es hipótesis nuestra. Esta
  decisión no lo cierra, solo lo aplica también al portal.
