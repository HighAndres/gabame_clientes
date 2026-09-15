# Sistema de diseño (corte 1, aprobado)

Marca del **grupo** tomada de gabame.com. Ninguna empresa aporta su paleta: dentro del portal cada
empresa aparece solo con su nombre y, cuando exista, su logo.

## Tokens (`frontend/src/app/globals.css`)

| Uso | Valor |
|---|---|
| Azul GABAME (acciones, enlaces, activo) | `#3d7cc9` · hover `#3369ad` |
| Azul suave (fondo de pildora activa, iconos) | `#eaf1fa` · texto `#2b5a91` |
| Gris GABAME (titulos) | `#504f51` |
| Texto | `#2b2b2d` · secundario `#6b6f76` |
| Fondo de pagina | `#f6f7f9` · superficie `#ffffff` |
| Borde | `#e3e6ea` · campos `#d5d9de` |
| Naranja (SOLO estados pendientes y contadores) | `#ef8f00` |
| Verde validado | `#1f8f5f` · rojo rechazado `#d24b4b` |
| Radios | tarjetas 12 px · botones y campos 8 px |
| Tipografia | Lato 400/700 via `next/font` (`--font-lato`) |

Sin sombras: las superficies se separan por borde y fondo.

## Componentes propios

- `components/marca/logo.tsx`: logotipo del grupo (`public/marca/logo-gabame.svg`).
- `components/ui/estado.tsx`: chip de estado (`pendiente`, `validado`, `rechazado`, `publicada`,
  `borrador`). Unico lugar donde entra el naranja.
- `components/ui/avatar-iniciales.tsx`: avatar con iniciales en azul suave.
- `components/portal/nav-link.tsx`: pildora de navegacion con `aria-current`.
- `components/ui/lista.tsx`: `Lista` + `Fila` + `TituloSeccion`. Caja con borde y filas separadas
  por linea, para elementos equivalentes que se recorren con la vista.
- `components/portal/bloque-principal.tsx`: el bloque ancho que abre el inicio, con etiqueta,
  titulo, estado, cifras y una sola accion.

## Shells

- **Portal** (`app/(portal)/layout.tsx`): barra superior, logo, pildoras, usuario. Paciente,
  medico y partner.
- **Admin** (`app/(admin)/admin/layout.tsx`): barra lateral de 248 px con el espacio de la
  empresa, modulos con icono y contador de pendientes. El selector de espacio real llega con los
  vinculos por empresa (corte 2).
- **Auth** (`app/(auth)/layout.tsx`): logo arriba, tarjeta centrada de 440 px.

## Patrones

- Tablas: contenedor con borde, cabecera en fondo de pagina con etiqueta en mayusculas, filas
  con borde superior, acciones a la derecha. En movil las filas se apilan.
- **Tarjeta o fila.** Una tarjeta pesa como un destino: se usa cuando hay pocos y cada uno vale
  por si mismo (las cuatro empresas, las piezas del ecosistema). Una coleccion de elementos
  equivalentes que se recorren con la vista va en `Lista`: doce tarjetas iguales no jerarquizan
  nada y ocupan tres pantallas.
- **Un solo bloque principal por pantalla de inicio**, el de lo que esa persona viene a hacer, con
  su estado y sus cifras dentro y no a un clic. Lo demas no se duplica ahi: ya esta en el menu.
- El logotipo del grupo identifica, no decora: va en la cabecera de un espacio y en el catalogo
  del ecosistema. Repetido en cada elemento de una lista es ruido; ahi la empresa va por su nombre.
- Estados vacios: una frase en texto secundario, sin ilustraciones.
- Iconos: lucide-react, 18-20 px, trazo 1.5. Nunca emoji.
- Copy: habla de lo que la persona obtiene; nunca de la arquitectura de identidad.

Lienzo de referencia: artifact "Cuenta GABAME" (claude.ai/code/artifacts).
