# T38 — Dominios propios por tienda

## Contexto

Pedido original del usuario: que cada tienda de `fabbric` pueda vivir en su
propio dominio (ej. `eliathimodas.com`), no solo bajo
`https://fabbric.aivance.cloud/store/<slug>`. El DNS del primer caso real
(Eliathi Modas) ya apunta al VPS (`A @ → 72.60.242.89`,
`CNAME www → eliathimodas.com`); falta agregar el dominio al servicio
`fabbric-frontend` en EasyPanel y hacer que el código lo reconozca.

Deploy actual (EasyPanel + Traefik delante, SSL automático): 4 servicios —
`fabbric-frontend` (nginx sirviendo el SPA de `frontend/`, puerto 80),
`fabbric-backend`, `fabbric-pwa` y `fabbric-pwa2` (dos deploys del mismo
`pwa/` — ver T33 — nada que ver con la tienda pública).

Este análisis se hizo en dos pasos: primero una investigación de solo
lectura contra el código real (sin tocar nada) para confirmar o corregir
las asunciones del pedido original, después este documento. Todo lo que
sigue está verificado contra el código, no asumido.

## Arquitectura real (verificado)

**Router**: `frontend/` usa react-router-dom v7 (`createBrowserRouter`,
`frontend/src/router.tsx:1,29`). La tienda pública es una ruta anidada:

```
{ path: "/store/:slug", element: <StoreLayout /> }
```

con hijos relativos (`router.tsx:64-82`): index → `CatalogHomePage`,
`categorias`, `c/:categorySlug`, `col/:collectionSlug`, `m/:brandSlug`,
`novedades`, `ofertas`, `buscar`, `p/:productId`, `checkout`,
`checkout/result`, `portal/orders`, `portal/orders/:orderId`.

La raíz `/` hoy SIEMPRE hace `<Navigate to="/store/eliathi-modas" replace />`
(`router.tsx:32`, sin condición) — colisiona directo con el objetivo de
este pedido, ver "Decisiones a resolver" más abajo.

**Cómo se obtiene el slug**: en un solo lugar —
`const { slug } = useParams<{ slug: string }>()` en
`frontend/src/features/store/StoreLayout.tsx:173`. No es un React Context:
es un objeto `StoreContext` (`{ slug, config }`,
`frontend/src/features/store/types.ts:59-62`) que `StoreLayout` arma y pasa
hacia abajo vía `<Outlet context={ctx} />` (`StoreLayout.tsx:263,393`), y
cada página hija lo lee con `useOutletContext<StoreContext>()`
(`CatalogHomePage.tsx:159`, `CheckoutPage.tsx:29`, `StoreProductPage.tsx:19`,
y 5 páginas más). Algunos componentes reciben el slug como prop en vez de
leer el context (`CustomerAuthProvider`, `CartProvider`, `SearchBar`,
`AccountButton`, `CartDrawer`, `HomeSectionsRenderer` —
`StoreLayout.tsx:277-278,353,365,490`).

**Buena noticia que esto da**: hay un solo punto de resolución del slug
(`StoreLayout.tsx:173`). Cambiarlo para que, en vez de leer siempre el
`:slug` de la URL, resuelva la tienda por dominio cuando corresponda, es un
cambio centralizado — no disperso.

**Links hardcodeados con `/store/${slug}`**: confirmado el problema que
anticipaba el pedido — **~52 ocurrencias reales en 15 archivos** de
`frontend/src/`, todas ad-hoc (ningún helper existe hoy — se buscó en
`frontend/src/lib/` y solo hay `api.ts`, `money.ts`, `slug.ts`
—`slugify()`—, `supabaseClient.ts`):

| Archivo | Ocurrencias |
|---|---|
| `features/store/StoreLayout.tsx` | ~15 |
| `features/store/pages/CatalogHomePage.tsx` | 6 |
| `features/store/pages/CategoriesIndexPage.tsx` | 4 |
| `features/store/pages/CategoryPage.tsx` | 5 |
| `features/store/pages/StoreProductPage.tsx` | 5 |
| `features/store/pages/CheckoutResultPage.tsx` | 3 |
| `features/store/pages/OrderDetailPage.tsx` | 3 |
| `features/store/pages/MyOrdersPage.tsx` | 2 |
| `features/store/pages/CheckoutPage.tsx` | 1 |
| `features/store/components/SearchBar.tsx` | 3 |
| `features/cart/CartDrawer.tsx` | 1 |
| `features/catalog/HomeSectionsRenderer.tsx` | 1 |
| `features/admin/AdminLayout.tsx` | 1 (link "Ver tienda") |
| `features/admin/pages/MyStorePage.tsx` | 2 (muestra/copia la URL pública) |
| `router.tsx` | 2 (redirect raíz + la ruta en sí) |

`pwa/src` no tiene ninguna ocurrencia — confirma que no sirve páginas de
tienda (ver más abajo).

**API y CORS**: el frontend arma la URL de la API con
`import.meta.env.VITE_API_URL` (`frontend/src/lib/api.ts:3`, horneado en
build time vía Docker ARG/ENV — `frontend/Dockerfile:29-36`). En
producción es una URL absoluta y de otro origen
(`https://frontend-fabbric-backend.ka3c6z.easypanel.host`, ver
`docs/T33_EscaneoEnVivo/tareas/01.../01....md:27-28,56-57`) — **CORS es
obligatorio**, no opcional, para que un dominio propio pueda hablarle a la
API.

El backend registra `@fastify/cors` con
`origin: [env.FRONTEND_URL, env.PWA_URL, /\.trycloudflare\.com$/]`
(`backend/src/index.ts:91-109`) — una lista fija de 2 variables de
entorno de una sola URL cada una (`z.string().url()`,
`backend/src/config/env.ts:18,21`), sin wildcard. Agregar dominios propios
dinámicamente necesita código nuevo (ver Fase 2).

**`fabbric-pwa`/`fabbric-pwa2`**: `pwa/` es la app de escaneo del
vendedor (pantallas Escanear/Alta/Ficha/Carrito/Confirmar,
`pwa/src/screens/`), con su propio manifest ("Eliathi Modas — Stock",
`pwa/vite.config.ts:28`) y `base: "/stock/"` en build
(`pwa/vite.config.ts:13`), servida en `fabbric.aivance.cloud/stock`.
`fabbric-pwa2` es un segundo deploy EasyPanel del MISMO código (rama
`develop`, ver T33), no una app distinta. **Ninguno de los dos sirve la
tienda pública** — quedan completamente afuera del alcance de T38.

**Manifest/service worker/SEO en `frontend/`**: no existe nada de esto.
Sin `vite-plugin-pwa`, sin `frontend/public/`, sin manifest, sin
meta-tags de canonical/OG (`frontend/index.html:1-24` solo tiene
charset/viewport/title estático/fuentes). Menos trabajo del que el pedido
original preveía en este punto.

**Dónde encaja `custom_domain`**: `catalog_configs`
(`backend/src/db/schema.ts:452-509`) — una fila por org
(`orgId ... .unique()`), ya tiene `slug` único
(`slug: text("slug").notNull().unique()`, línea 460, comentado como "URL
pública de la tienda (/store/<slug>) — único GLOBAL") y otros campos
nullable por org (branding, redes, credenciales MP/AFIP). Un
`customDomain` nullable y único encaja ahí sin fricción. El lookup por
slug ya existe en `backend/src/modules/catalogConfig/service.ts:17`
(`eq(catalogConfigs.slug, slug)`), y la unicidad se valida en
`routes.ts:48` — mismo patrón a replicar para `customDomain`.

## Decisiones del pedido original (ya resueltas, se toman como dadas)

1. Columna nueva `customDomain` (nullable, único) en `catalog_configs` +
   su migración.
2. Endpoint público `GET /public/stores/by-domain?host=<hostname>` que
   devuelve la tienda o 404.
3. En el frontend, al arrancar: si `window.location.hostname` no es el
   dominio principal de la plataforma (configurable por env var), resolver
   la tienda con ese endpoint y montar las rutas de la tienda en `/` en vez
   de bajo `/store/:slug`.
4. Un helper único para generar links de la tienda (con o sin el prefijo
   `/store/<slug>` según el modo), que reemplace los ~52 call sites
   hardcodeados de la tabla de arriba.
5. CORS dinámico por dominios propios registrados (no `*`).
6. Dominio principal de la plataforma configurable por variable de
   entorno (hoy: implícito en `FRONTEND_URL`).

## Decisiones a resolver antes de implementar — YA RESUELTAS por el usuario

1. **Redirect hardcodeado de `/`** (`router.tsx:32`): hoy SIEMPRE manda a
   `/store/eliathi-modas`. Tiene que dejar de hacerlo cuando el host ya es
   un dominio propio — es el primer punto de fricción real al implementar,
   no un detalle menor. (Sin decisión de negocio pendiente, es simplemente
   parte del trabajo de la Fase 3.)
2. **Back URL de Mercado Pago**: **decidido — vuelve siempre a
   `fabbric.aivance.cloud`**, se acepta ese salto de dominio al volver de
   pagar. Cero cambios en `backend/src/modules/payments/service.ts`.
3. **Supabase Auth — allowlist de redirect URLs**: el login de clientes
   usa `redirectTo: window.location.href`
   (`frontend/src/features/store/CustomerAuthContext.tsx:67`). Sin agregar
   `https://eliathimodas.com/**` (y `www`) a mano en la configuración de
   Supabase Auth, el login con Google falla silenciosamente en el dominio
   propio. Paso operativo (no código) — va en el checklist de la Tarea 4.
4. **CORS dinámico necesita acceso a datos, no solo a env vars**: el
   `origin` de `@fastify/cors` puede ser una función
   (`(origin, cb) => ...`), pero esa función correría en cada preflight —
   conviene un cache chico en memoria de `customDomain → org` (refrescado
   cada tanto o invalidado al guardar la config), no una consulta a la DB
   por request.
5. **Alta de dominios futuros**: **decidido — manual por SQL, sin UI de
   autoservicio** (Opción A: un dominio nuevo se carga directo en la base
   de datos, no hay botón en el panel del dueño de la tienda para
   hacerlo solo). Si en el futuro hace falta autoservicio, es una fase
   aparte.

## Fuera de alcance de T38

- UI de autoservicio para que un dueño de tienda cargue su propio dominio
  (ver punto 5 arriba) — alta manual vía SQL/migración por ahora.
- Verificación automática de DNS (confirmar que el dominio realmente
  apunta al VPS antes de activarlo) — se asume que quien carga el dominio
  ya confirmó el DNS a mano (como ya pasó con Eliathi Modas).
- Certificados SSL — los maneja Traefik/EasyPanel automáticamente al
  agregar el dominio al servicio, no es código de este repo.
- `pwa`/`fabbric-pwa2` — confirmado que no sirven la tienda pública, cero
  cambios ahí.
- Hacer que el `back_url` de Mercado Pago seguro respete el dominio
  propio (punto 2 de "Decisiones a resolver") — queda pendiente de la
  decisión del usuario; si se pide lo simple (aceptar el salto de
  dominio), no hay trabajo extra; si se pide lo prolijo, se suma una tarea.

## Criterios de aceptación

- Entrar a `https://eliathimodas.com` muestra directamente la tienda
  "eliathi-modas" en la raíz, con el dominio propio en la barra (sin
  redirigir a `fabbric.aivance.cloud`).
- Todas las rutas internas de la tienda (catálogo, producto, checkout,
  portal de pedidos) funcionan bajo el dominio propio sin el prefijo
  `/store/<slug>`.
- `https://fabbric.aivance.cloud/store/eliathi-modas` (y cualquier otro
  slug) sigue funcionando exactamente igual que hoy.
- Login de cliente (Google OAuth) funciona en el dominio propio.
- El checkout (pago con Mercado Pago) completa la compra correctamente
  desde el dominio propio — con el comportamiento del back_url que se
  haya decidido explícitamente (punto 2 de arriba).
- CORS deja pasar al dominio propio sin abrir un wildcard.
- `tsc --noEmit` limpio en `backend/` y `frontend/`.
- Probado localmente simulando el host (`/etc/hosts` o header `Host`)
  antes de tocar producción.
