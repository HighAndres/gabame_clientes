# ADR-0010 — Una sola forma de decidir permisos: sin dependencias sin uso

- **Fecha:** 2026-09-13
- **Estado:** Aceptado. Supersede el punto 3 de ADR-0008 en lo que dice de `require_partner_aprobado`,
  y la mención de `require_alcance_pacientes` en ADR-0004
- **Decide:** Andres Celis (Mirmibug)

## Contexto

Una revisión del sistema de accesos encontró cuatro dependencias de autorización definidas en
`app/api/deps.py` que no protegían ningún endpoint: `require_role`, `require_empresa`,
`require_alcance_pacientes` y `require_partner_aprobado`. Solo las cubrían pruebas unitarias que
las llamaban directamente, así que las pruebas pasaban sin que ninguna regla estuviera aplicada.

Dos de ellas, además, estaban documentadas como si funcionaran. ADR-0008 decía que
`require_partner_aprobado` "exige al menos un vínculo aprobado" y ADR-0004 citaba
`require_alcance_pacientes` como el lugar donde se resuelve el alcance sobre pacientes. Ninguna de
las dos afirmaciones era cierta en el código. Las reglas que describían sí se cumplen, pero las
aplica otro código.

El riesgo no es de seguridad inmediata: nada quedaba abierto. El riesgo es de diseño. Una
dependencia con nombre de regla invita a que alguien la conecte más adelante y aparezca una segunda
forma de decidir lo mismo, en desacuerdo con la primera.

## Decisión

1. **Cada dependencia de `deps.py` protege al menos un endpoint.** Si una regla deja de usarse se
   retira, no se conserva "por si acaso". Queda escrito en el docstring del módulo.
2. **Se retiran `require_role` y `require_empresa`.** El modelo de alcance por empresa de ADR-0008
   (`Alcance.administra`, `Alcance.edita` y las dependencias `require_*` que sí se usan) las
   superó. La regla "un admin de una empresa no ve datos de otra" se aplica en el router de admin y
   ahora tiene prueba sobre endpoints reales, no sobre la dependencia.
3. **Se retira `require_alcance_pacientes` y la propiedad `Alcance.ve_pacientes`** (con su espejo
   `vePacientes` en el frontend). La regla "solo `admin_grupo` ve pacientes" se aplica en
   `_usuarios_visibles`, la consulta que arma el único listado donde un paciente aparece: para un
   admin que no es de grupo, ese listado solo incluye usuarios con vínculo en sus empresas, médicos
   si administra GABAME, y los admins y editores de sus empresas. Un paciente no cae en ninguna de
   las tres. La regla queda fijada con una prueba sobre el endpoint.
4. **Se retira `require_partner_aprobado`: el área Partners está abierta a cualquier partner con
   perfil.** La aprobación de un vínculo depende de los documentos que se cargan dentro de esa
   misma área, así que exigir un vínculo aprobado para entrar sería un candado sin llave. Lo que sí
   exige vínculo aprobado es el detalle de cada empresa, y esa regla es **por vínculo, no por
   cuenta**: el contacto comercial y el portal operativo solo viajan con el vínculo validado
   (router de partners y `EspacioMioOut`), y las publicaciones para partners solo con vínculo
   validado **con esa empresa** (`audiencias_permitidas`). Un partner aprobado con Ordan y en
   revisión con A7 ve el detalle de Ordan y no el de A7; eso ya estaba implementado y ahora está
   cubierto por prueba.

## Consecuencias

- `deps.py` queda con siete dependencias, todas conectadas: `get_usuario_actual`,
  `get_alcance_admin`, `require_alcance_medicos`, `require_contenido_rx`,
  `require_administra_alguna`, `require_partner` y `require_medico_validado`, más las funciones
  `audiencias_permitidas` y `acceso_audiencia`.
- `tests/test_permisos.py` deja de probar dependencias en aislamiento y prueba reglas sobre
  endpoints. Es la diferencia entre "la función rechaza" y "el sistema rechaza".
- Se actualizan `CLAUDE.md` y `docs/arquitectura.md`, que nombraban las dependencias retiradas.
- Si en el futuro se decide que pedir vínculo con otra empresa exija tener uno aprobado (para evitar
  solicitudes a las cuatro empresas a la vez), esa regla se agrega en el servicio de vínculos con su
  prueba, no reviviendo una dependencia por cuenta.
