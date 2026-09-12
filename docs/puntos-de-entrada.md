# Puntos de entrada desde los sitios del grupo

Los sitios corporativos y las tiendas **enlazan** al portal; no hay otra integración (regla 2).
Cada botón apunta a una **puerta** por audiencia. Las puertas son las únicas URLs que los sitios
conocen: lo que hay detrás (login, registro, a dónde cae la persona) puede cambiar sin tocar los sitios.
La definición vive en `frontend/src/lib/entradas.ts`.

Al entrar, la persona **se queda en el portal** (decisión del cliente, 2026-09-12). Solo vuelve al
sitio si el enlace trae `redirect=` con un dominio del grupo (`src/lib/dominios-grupo.ts`).

## Puertas

| Puerta | URL | Tipo de cuenta que preselecciona | Destino al entrar |
|---|---|---|---|
| Área médica | `/medicos` | Profesional de la salud (pide cédula) | Área médica (`/medico`) |
| Portal de clientes | `/clientes` | Paciente o consumidor | Inicio (`/dashboard`) |
| Empresas y distribuidores | `/empresas` | Empresa (partner); acepta `empresa=` para marcar la empresa del grupo | Partners (`/partner`) |

Comportamiento común:

- Con sesión activa la puerta no se muestra: la persona va directo al destino.
- Sin sesión ofrece **Entrar** y **Crear cuenta**, ya con el tipo elegido. En el registro se puede
  cambiar de tipo.
- Si la cuenta no tiene el rol del destino (por ejemplo un paciente que entra por `/medicos`), cae al
  inicio del portal; no ve un error.
- Se conservan `origen`, `ruta` y `campana` hasta el registro o el login, donde se guardan en el historial
  de orígenes (append-only; nunca IP ni navegador).

## Parámetros

| Parámetro | Valores | Para qué |
|---|---|---|
| `origen` | `gabame`, `medinter`, `ordan`, `a7`, `tiendagabame`, `aurashop`, `app_paciente` | Desde qué pieza llegó. Obligatorio en los botones |
| `ruta` | ruta interna del sitio (`/conocer-mas`) | Desde qué página del sitio |
| `campana` | texto corto | Campaña o etiqueta de medición |
| `empresa` | `gabame`, `medinter`, `ordan`, `a7` | Solo en `/empresas`: empresa marcada en el registro |
| `redirect` | URL https de un dominio del grupo | Solo si se quiere que vuelva al sitio |

## Fragmentos para pegar en cada sitio

Sustituir `https://clientes.gabame.com` por el dominio activo (`https://clientesgabame.mirmiapps.com`
mientras no exista el definitivo). Son enlaces normales: no requieren nada más del sitio.

**gabame.com** (los dos botones actuales):

```html
<a href="https://clientes.gabame.com/medicos?origen=gabame">Área médica</a>
<a href="https://clientes.gabame.com/clientes?origen=gabame">Portal de clientes</a>
```

**medinter.com.mx**:

```html
<a href="https://clientes.gabame.com/empresas?origen=medinter&empresa=medinter">Portal de clientes</a>
```

**ordan.com.mx**:

```html
<a href="https://clientes.gabame.com/empresas?origen=ordan&empresa=ordan">Distribuidores</a>
```

**a7siete.com**:

```html
<a href="https://clientes.gabame.com/empresas?origen=a7&empresa=a7">Socios</a>
```

Para medir una campaña concreta se agrega `&campana=<nombre>`; para saber desde qué página, `&ruta=/pagina`.

**tiendagabame.com y Aurashop**: no enlazan todavía. Siguen con sus cuentas propias hasta la fase de
SSO (Fase 6), en la que delegan el login aquí.

## Pendiente

- Dominio definitivo (`clientes.gabame.com`, pendiente 0.6): DNS y certificado en el cPanel del cliente. Hasta
  entonces los fragmentos usan el dominio de pruebas.
- Pegar los fragmentos en los sitios (lo hace quien administre cada sitio) y comprobar en el historial de
  orígenes que cada uno registra su entrada.
