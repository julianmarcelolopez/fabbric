# Plan — Dominios propios por tienda (T38)

Basado en `analisis.md` (arquitectura real verificada contra el código,
las decisiones ya dadas por el pedido original, y las 5 decisiones
encontradas que faltaba resolver). Este plan ordena el trabajo en 4 fases
por dependencia; no repite el análisis.

**Antes de implementar, falta tu OK sobre los puntos 2 y 5 de "Decisiones
a resolver" en `analisis.md`** (back_url de Mercado Pago cruzando de
dominio, y confirmar que el alta de dominios queda manual/SQL por ahora)
— el resto de las decisiones ya están tomadas.

| # | Fase | Depende de |
|---|---|---|
| 1 | Backend: columna `customDomain` + endpoint de resolución por host | nada |
| 2 | Backend: CORS dinámico por dominios propios | 1 |
| 3 | Frontend: detección de host + helper de links + reemplazo de los ~52 call sites | 1 |
| 4 | Alta de eliathimodas.com/www + verificación local y en EasyPanel | 2, 3 |

## Desglose en tareas

Mismo formato que `docs/T35_FinanzasVistaDiaria/tareas/`
(Objetivo/Alcance/Criterio de aceptación/Dependencias).

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-backend-dominio-y-resolucion](tareas/01-backend-dominio-y-resolucion/01-backend-dominio-y-resolucion.md) | nada | ✅ |
| 2 | [02-cors-dinamico](tareas/02-cors-dinamico/02-cors-dinamico.md) | 1 | ✅ |
| 3 | [03-frontend-deteccion-host-y-helper-links](tareas/03-frontend-deteccion-host-y-helper-links/03-frontend-deteccion-host-y-helper-links.md) | 1 | ✅ |
| 4 | [04-verificacion-y-alta-eliathi-modas](tareas/04-verificacion-y-alta-eliathi-modas/04-verificacion-y-alta-eliathi-modas.md) | 2, 3 | 🔶 dominio cargado + backend verificado; falta la parte manual del usuario (EasyPanel, Supabase Auth, navegador real) |

## Fase 1 — Backend: `customDomain` + resolución por host

- Migración: `catalog_configs` suma `custom_domain` (text, nullable,
  único — mismo patrón que `slug` en `backend/src/db/schema.ts:460`).
- `packages/shared`: sumar el campo a los schemas de `catalogConfig` que
  correspondan (lectura y — a definir si se expone edición por
  `updateCatalogConfigSchema`, ver nota de autoservicio en `analisis.md`;
  por ahora alcanza con que se pueda LEER, la escritura es manual/SQL).
- Nuevo endpoint público `GET /public/stores/by-domain?host=<hostname>` en
  el módulo de `catalogConfig` (mismo criterio que el lookup por slug ya
  existente en `catalogConfig/service.ts:17`) — normaliza `host` (sacar
  `www.` para que `eliathimodas.com` y `www.eliathimodas.com` resuelvan a
  la misma tienda, o se guardan ambas variantes en la columna — decidir en
  la tarea), devuelve la config pública de la tienda (mismo shape que
  `/public/:slug/config`) o 404 si no hay match.

**Verificación**: `tsc --noEmit` limpio en `backend/`; `curl` contra el
backend en Docker con `?host=eliathimodas.com` después de cargar el
dominio a mano en la DB, y confirmar 404 con un host no registrado.

## Fase 2 — Backend: CORS dinámico

- `backend/src/index.ts` (registro de `@fastify/cors`, línea ~91-109):
  reemplazar la lista fija `[FRONTEND_URL, PWA_URL, regex]` por una
  función `origin` que además deje pasar cualquier `customDomain`
  registrado en `catalog_configs` — con un cache chico en memoria
  (ver "Decisiones a resolver" #4 de `analisis.md`) para no consultar la
  DB en cada preflight.
- Definir cuándo se invalida/refresca ese cache (ttl corto, ej. 60s,
  alcanza para este caso de uso — no hace falta invalidación activa al
  guardar la config).

**Verificación**: request con `Origin: https://eliathimodas.com` contra el
backend en Docker, con el dominio ya cargado, y confirmar que el preflight
lo acepta; con un dominio no registrado, confirmar que lo sigue
rechazando (nada de wildcard).

## Fase 3 — Frontend: detección de host + helper de links

- Dominio principal de la plataforma por env var (ej. `VITE_PLATFORM_HOST`,
  default `fabbric.aivance.cloud`).
- Al arrancar la app (antes o junto al router): si
  `window.location.hostname` no es el dominio principal, llamar a
  `GET /public/stores/by-domain?host=...`; si matchea, montar las rutas de
  la tienda en `/` (no bajo `/store/:slug`) con el slug resuelto; si no
  matchea, página de error clara (dominio no configurado). El redirect
  hardcodeado de `/` (`router.tsx:32`) pasa a ser condicional: solo corre
  en el dominio principal.
- Nuevo helper único (ej. `frontend/src/lib/storeLinks.ts`) que arma cada
  link de la tienda según el modo (con `/store/<slug>` en el dominio
  principal, sin prefijo en un dominio propio) — reemplaza los ~52 call
  sites listados en `analisis.md` (15 archivos).
- `StoreLayout.tsx:173` deja de asumir que el slug siempre viene de
  `useParams` — lo toma del modo resuelto al arrancar (dominio propio) o
  del param de la URL (dominio principal), sin duplicar lógica.

**Verificación**: `tsc --noEmit` limpio en `frontend/`; navegación manual
por todas las páginas de la tienda en ambos modos (con `/store/<slug>` y
simulando el dominio propio localmente, ver Fase 4) confirmando que
ningún link rompe el modo activo.

## Fase 4 — Alta de Eliathi Modas + verificación

- Cargar `eliathimodas.com` (y `www.eliathimodas.com`) como
  `customDomain` de la org de Eliathi Modas — instrucción SQL directa
  contra la DB real (mismo criterio que otras cargas puntuales de esta
  sesión, ver `docs/T37_FixesSesionDemoEnVivo/`), no por UI.
- Verificación local simulando el host: editar `/etc/hosts` (o mandar el
  header `Host: eliathimodas.com` a mano con curl/Postman contra el
  backend) antes de tocar producción.
- EasyPanel: agregar `eliathimodas.com` y `www.eliathimodas.com` como
  dominios del servicio `fabbric-frontend` (ya lo tenía planeado el
  usuario), apuntando al mismo contenedor que `fabbric.aivance.cloud`.
- Supabase Auth: agregar `https://eliathimodas.com/**` (y `www`) a la
  allowlist de redirect URLs — paso operativo, no código (ver
  "Decisiones a resolver" #3 de `analisis.md`).
- Confirmar en el navegador real: `eliathimodas.com` muestra la tienda en
  `/`, navega todas las secciones, el login con Google funciona, y el
  checkout con Mercado Pago completa una compra de prueba.

**Verificación**: checklist de arriba, más un repaso de que
`fabbric.aivance.cloud/store/eliathi-modas` sigue andando idéntico (no se
rompió nada del modo existente).

## Checklist para dar de alta futuros dominios de otros clientes

(Entregable pedido explícitamente — se completa al cerrar T38, queda acá
como referencia para cuando haga falta.)

1. Confirmar que el DNS del cliente apunta al VPS (A/CNAME).
2. Cargar el dominio (y su variante `www`) en `custom_domain` de su
   `catalog_configs` — SQL directo (no hay UI de autoservicio, ver
   `analisis.md`).
3. Agregar el dominio como dominio del servicio `fabbric-frontend` en
   EasyPanel (mismo contenedor, sin redeploy de código).
4. Agregar el dominio a la allowlist de redirect URLs de Supabase Auth.
5. Probar en el navegador: la tienda carga en `/`, el login funciona, el
   checkout completa.

## Criterios de aceptación y fuera de alcance

Ver `analisis.md` — no se repiten acá.
