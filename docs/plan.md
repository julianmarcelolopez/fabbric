# SaaS multi-tenant de gestión para negocios de ropa (catálogo + stock + checkout + envíos + pedidos + clientes + finanzas + métricas)

> Plan aprobado — copia versionada en el repo. El original vive en `C:\Users\JulianLopez\.claude\plans\whimsical-greeting-pumpkin.md` (local a esta máquina); esta copia es la fuente de verdad del proyecto.

## Contexto

El usuario tiene un local de ropa y venía evaluando `byos-platform`, una plataforma que no construyó y en la que no confía del todo. En esa conversación apareció un segundo antecedente: **Bordart**, un admin panel construido por un tercero (Uriel). Se asumió inicialmente que de Bordart solo había una captura y un brief escrito, sin código accesible — **esa asunción era incorrecta**: existe el repo completo en `C:\projects\bordart-admin`, una app Next.js 16 (App Router, React 19) funcional y con lógica de negocio real para una sola tienda, corriendo o cerca de correr en producción. Fue analizado a fondo (2026-07-06) y varios de sus patrones, validados contra un negocio real y no contra una hipótesis, se incorporaron a este plan. El objetivo del proyecto pasó de "un catálogo para mi local" a **generalizar la idea en un SaaS multi-tenant vendible a cualquier negocio de ropa**, omnicanal (local físico + tienda online), con portal propio para el vendedor y otro para el comprador.

Ninguna de las dos referencias resuelve el sistema completo. Lo que se aprovecha de cada una es puntual:
- **De Bordart (por código real, no solo por una captura):** categorías y colecciones como taxonomías paralelas con curaduría manual de productos destacados por sección para el home; estado de pedido con la regla de negocio "no se puede completar sin estar cobrado"; un módulo financiero completo (carteras + movimientos + ganancia bruta/neta con snapshot de costo); pedidos personalizados/bespoke conviviendo con pedidos de catálogo; dashboard personalizable por usuario (drag & drop). Su gap sigue siendo el mismo que se identificó antes: no tiene checkout real (el "carrito" arma un mensaje de WhatsApp, no crea una orden), no tiene multi-tenancy, y su auth es custom sin RLS (service-role key en todos lados, sesión = id crudo en cookie) — nada de esto se reutiliza tal cual, se reconstruye mejor en fabbric.
- **De `byos-platform` (código revisado):** el modelo de variante con `talle`/`color`/stock explícitos, el patrón de zonas de envío (nombre + costo fijo + envío gratis desde monto X), el patrón de historial de movimientos de stock (tipo + delta), y el flujo de subida de imágenes con el backend como intermediario a Supabase Storage.
- **Gap real, no resuelto por ninguna de las dos:** portal cliente con Google OAuth, carrito + checkout con Mercado Pago y máquina de estados de pedido, envíos con couriers, stock omnicanal, dashboard de métricas, chatbot IA.

Decisiones de alcance ya acordadas:
- **Chatbot IA (Módulo 8): fuera de este plan**, fase posterior al MVP (es un tipo de trabajo distinto — RAG/LLM — al resto).
- **Colecciones son muchos-a-muchos** con producto; **categoría sigue siendo una sola por producto**. (Nota: Bordart usa selección única para ambas + curaduría manual por sección; se mantiene la decisión de m2m por ser más flexible, pero queda como punto a reconfirmar si en la práctica resulta sobre-ingeniería para el caso de uso real.)
- **Stock omnicanal = split manual** (`stockOnline` / `stockLocal` por variante, ajustado a mano). **Sin POS/caja.**
- **Envíos v1 = zonas con costo fijo** configuradas por el admin. Envíos v2 (couriers, tracking automático) queda fuera de este plan.
- **Pedidos personalizados/bespoke sí forman parte del alcance**: un `order_item` puede no tener `productId` (ítem hecho a medida, con imagen de referencia y costo cargado a mano), conviviendo con ítems de catálogo en la misma orden.
- **Módulo de Finanzas sí forma parte del alcance** (carteras + movimientos + ganancia bruta/neta), inspirado en el patrón ya validado en producción por Bordart.
- **Integración Chatwoot/WhatsApp (mensajería unificada) fuera de este plan**, mismo criterio que el chatbot: post-MVP, evaluar como módulo aparte.

## Decisiones de stack

- Repo nuevo (`fabbric`), separado de `byos-platform` y de `bordart-admin`. Monorepo con `npm workspaces`.
- **Backend: Fastify + TypeScript**, Zod para validación, `@fastify/multipart` para imágenes.
- **ORM: Drizzle** sobre **Postgres del propio proyecto Supabase** (misma instancia donde vive `auth.users`).
- **Frontend: React + Vite + TypeScript**, un SPA con React Router.
- **Auth y Storage: Supabase.** Un solo proyecto Supabase sirve a los tres tipos de login (super admin, vendedor, comprador). A diferencia de Bordart, se usa Supabase Auth real (JWT verificado) en vez de una tabla de usuarios con cookie=id crudo, y las queries van scoped por `orgId` como defensa en profundidad (ver también la sección de RLS en la hoja de ruta hacia SaaS, más abajo).
- **Pagos: Mercado Pago Checkout Pro** para v1. Bricks queda como mejora post-MVP.
- **Notificaciones por email**: proveedor transaccional simple (ej. Resend).

## Modelo de roles / portales

Un solo proyecto Supabase Auth, tres "tipos de principal" resueltos por tabla, no por proveedor distinto:

- **Super Admin**: fila en `admin_users` con `orgId = null` y `role = 'super_admin'`.
- **Portal Admin (vendedor)**: fila en `admin_users` con `orgId` y `role` (`owner`/`staff`). Login email/password o Google.
- **Portal Cliente (comprador)**: fila en `customers`, scoped por tenant (`unique(orgId, googleSub)`). Login solo Google OAuth.

El plugin de auth del backend valida el JWT de Supabase una sola vez y resuelve contra `admin_users` o `customers` según el grupo de rutas.

## Estructura de carpetas

```
/ (root)
  package.json                  # workspaces: ["frontend", "backend", "packages/*"]
  docker-compose.yml
  .env.example
  /supabase/migrations          # SQL versionado (drizzle-kit generate + migrate; no se usa push)

  /packages/shared
    src/schemas/                 # zod: product.ts, variant.ts, category.ts, collection.ts,
                                  # homeSection.ts, order.ts, customer.ts, stockMovement.ts,
                                  # shippingZone.ts, wallet.ts, financialMovement.ts

  /backend
    Dockerfile
    drizzle.config.ts
    src/
      index.ts
      config/env.ts
      db/
        client.ts
        schema.ts
      plugins/
        auth.ts                     # valida JWT Supabase; requireAdminAuth / requireCustomerAuth
        supabaseAdmin.ts             # cliente service-role (Storage)
        email.ts                     # cliente Resend (o similar)
      modules/
        superadmin/ categories/ collections/ homeSections/ products/ variants/
        images/ stock/ shippingZones/ catalogConfig/ orders/ payments/
        customers/ finance/ metrics/ portal/ public/
      lib/
        tenant.ts                   # ningún query sin WHERE org_id
        errors.ts

  /frontend
    Dockerfile
    vite.config.ts
    src/
      features/
        catalog/    # presentacional, compartido admin-preview + tienda pública
          ProductCard.tsx  ProductDetailView.tsx  HomeSectionsRenderer.tsx
        admin/
          pages/ LoginPage.tsx DashboardPage.tsx CategoriesPage.tsx CollectionsPage.tsx
                 HomeSectionsPage.tsx ProductsPage.tsx ProductEditPage.tsx StockPage.tsx
                 ShippingZonesPage.tsx CatalogConfigPage.tsx OrdersPage.tsx OrderNewPage.tsx
                 CustomersPage.tsx FinancePage.tsx WalletsPage.tsx MetricsPage.tsx
          components/ ImageDropzone.tsx VariantEditor.tsx DashboardCustomizable.tsx
        portal/     pages/ LoginPage.tsx MyOrdersPage.tsx OrderDetailPage.tsx
        cart/        CartContext.tsx CartDrawer.tsx CheckoutPage.tsx
        store/        pages/ CatalogHomePage.tsx CheckoutResultPage.tsx
        superadmin/    pages/ TenantsPage.tsx GlobalMetricsPage.tsx
```

## Modelo de datos

Todas las tablas de negocio llevan `orgId`.

- **`organizations`**: `id`, `name`, `slug`, `active`, `createdAt`.
- **`admin_users`**: `id` (= `auth.users.id`), `orgId` (nullable para super_admin), `email`, `role` (`super_admin`/`owner`/`staff`), `createdAt`.
- **`customers`**: `id`, `orgId`, `googleSub`, `email`, `name`, `phone?`, `address?`, timestamps, `unique(orgId, googleSub)`.
- **`categories`**: `id`, `orgId`, `name`, `slug`, `sortOrder`, `active`, timestamps.
- **`collections`**: `id`, `orgId`, `name`, `slug`, `active`, timestamps.
- **`product_collections`** (junction m2m): `productId`, `collectionId`.
- **`home_sections`**: `id`, `orgId`, `refType` (`category`|`collection`), `refId`, `sortOrder`, `visible`, timestamps.
- **`products`**: `id`, `orgId`, `categoryId`, `name`, `description`, `price` (precio de venta base; una variante puede pisarlo con `priceOverride`), `costPrice?` (costo interno, nunca expuesto en público), `status` (`active`/`paused`/`out_of_stock`), `visibleInCatalog`, `sortOrder`, timestamps.
- **`product_images`**: `id`, `productId`, `orgId`, `storagePath`, `url`, `sortOrder`, `createdAt`.
- **`product_variants`**: `id`, `productId`, `orgId`, `sku?`, `talle`, `color`, `stockOnline`, `stockLocal`, `priceOverride?`, timestamps, `unique(productId, talle, color)`.
- **`stock_movements`**: `id`, `orgId`, `variantId`, `channel` (`online`|`local`), `type` (`entrada`/`venta`/`ajuste`/`sync`), `delta`, `note?`, `createdAt`.
- **`catalog_configs`**: `id`, `orgId` (unique), `slug`, `storeName`, `logoUrl`, `accentColor`, `theme`, `businessDescription?`, `lowStockThreshold`, `active`, timestamps.
- **`shipping_zones`**: `id`, `orgId`, `name`, `cost`, `freeShippingFrom?`, `active`, timestamps.
- **`orders`**: `id`, `orgId`, `customerId?` (nullable — pedido cargado a mano por el admin sin cliente registrado), `orderNumber`, `status` (`pending`/`paid`/`preparing`/`shipped`/`delivered`/`cancelled`), `shippingZoneId?`, `shippingCost`, `subtotal`, `total`, `currency`, `trackingNumber?`, `mpPreferenceId?`, `mpPaymentId?`, timestamps. El tipo de pedido (catálogo/personalizado/mixto) se deriva al consultar según si sus `order_items` tienen o no `productId`; no se persiste.
- **`order_items`**: `id`, `orderId`, `orgId`, `productId?` (nullable — null = ítem personalizado/bespoke), `variantId?` (nullable), `name`/`talle`/`color` (snapshot), `qty`, `unitPrice`, `unitCostSnapshot?` (costo al momento de la venta, copiado de `products.costPrice` o cargado a mano para ítems personalizados — alimenta ganancia bruta/neta aunque el costo del producto cambie después), `total`, `referenceImageUrl?` (foto/boceto de referencia para ítems personalizados).
- **`wallets`** (carteras): `id`, `orgId`, `name`, `icon?`, `color?`, `initialBalance`, `active`, timestamps.
- **`financial_movements`**: `id`, `orgId`, `walletId`, `type` (`income`/`expense`), `amount`, `category?`, `description?`, `date`, `orderId?` (nullable — vincula un ingreso al pedido que lo generó), `createdAt`. Un movimiento vinculado a una orden no se puede borrar. Marcar un pedido como pagado por una vía distinta a Mercado Pago (venta telefónica/presencial) crea un `financial_movement` de tipo `income` vinculado a esa orden, y **eso** es lo que habilita avanzar su estado más allá de `pending` cuando no hay webhook de MP de por medio.

## API (agrupada por portal)

- **`/admin/*`** (JWT admin, scope por `orgId` salvo `super_admin`): CRUD de `categories`, `collections` (+ asignación a producto), `homeSections` (reorder+toggle), `products`, `variants`, `images` (upload+reorder+delete), `stock` (movimientos, stock crítico), `shippingZones`, `catalogConfig`, `orders` (lista/detalle/cambio de estado → email, alta manual con ítems de catálogo y/o personalizados), `customers` (lista+historial), `finance` (CRUD `wallets`, alta de `financial_movements`, reporte mensual, ganancia bruta/neta, marcar pedido como cobrado manualmente), `metrics`.
- **`/superadmin/*`**: lista de tenants, métricas agregadas sin filtro de `orgId`.
- **`/portal/*`** (JWT customer): perfil, `GET /portal/orders`, `GET /portal/orders/:id`.
- **`/public/*`** (sin auth, tenant por `slug`): config, home, detalle de producto, `POST /public/:slug/checkout` (requiere login customer).
- **`/webhooks/mercadopago`**: valida firma antes de confiar en el payload, responde error si falla algo (nunca 200 silencioso), consulta el pago real vía API de MP, marca `paid` y descuenta `stockOnline` **solo ahí**.

## Preview en vivo (dos niveles)

1. **Nivel producto**: `ProductDetailView` presentacional, alimentado por el estado del formulario en `ProductEditPage` (split pane), sin guardar primero.
2. **Nivel home** (como Bordart): `HomeSectionsRenderer` presentacional recibe la lista ordenada de `home_sections` con sus productos. En `HomeSectionsPage`, panel derecho "Vista previa" alimentado por el estado local de la lista arrastrable. Mismo componente que usa `CatalogHomePage` en la tienda pública real.

## Fases de implementación

1. **Fase 0 — Monorepo.** Workspaces, Dockerfiles, docker-compose, proyecto Supabase, `.env.example`, `GET /health`.
2. **Fase 1 — Multi-tenancy + Auth admin.** `organizations`, `admin_users` con roles, login email/password (Google para el admin se difiere a la Fase 6, donde el trámite de Google Cloud es obligatorio de todos modos por el portal comprador).
3. **Fase 2 — Catálogo base.** `categories`, `collections` (+ m2m), `products`, `product_variants`, `product_images` con upload+reorder, preview a nivel producto.
4. **Fase 3 — Secciones del home.** `home_sections` (reorder + toggle), `HomeSectionsPage` con preview a nivel home.
5. **Fase 4 — Stock.** `stock_movements`, alerta de stock mínimo, vista de stock crítico.
6. **Fase 5 — Catálogo público.** Rutas `store/*` de solo lectura.
7. **Fase 6 — Portal cliente + Carrito + Checkout + Mercado Pago.**
8. **Fase 7 — Pedidos (Admin).** Incluye alta manual de pedidos desde el admin (venta telefónica/presencial, sin pasar por el checkout público), ítems personalizados/bespoke (`productId` nulo + imagen de referencia + costo manual) conviviendo con ítems de catálogo en la misma orden, y clasificación derivada Catálogo/Personalizado/Mixto.
9. **Fase 8 — Clientes (Admin).**
10. **Fase 9 — Finanzas.** `wallets`, `financial_movements`, marcar pedido como cobrado manualmente, ganancia bruta/neta con snapshot de costo por ítem.
11. **Fase 10 — Métricas/Dashboard.** Incluye dashboard personalizable por usuario (drag & drop de tarjetas, persistido), y las métricas que dependen de finanzas: ganancia bruta/neta, ticket promedio, top productos vendidos, catálogo vs personalizado, canal de adquisición de clientes.

**Fuera de este plan**: Chatbot IA, Envíos v2, Portal Super Admin completo, Mercado Pago Bricks, integración Chatwoot/WhatsApp.

## Verificación por fase

- **Fase 0**: `docker compose up --build` levanta ambos contenedores; `/health` → 200.
- **Fase 1**: crear org + admin owner, login email/password, `orgId` resuelto correctamente (login Google del admin se verifica en Fase 6).
- **Fase 2**: 2 categorías, 2 colecciones, producto en ambas colecciones con variantes talle/color y stock online/local distinto; preview en vivo.
- **Fase 3**: lista de home mezclando categorías/colecciones, reorder, toggle, preview en vivo, persistencia tras recargar.
- **Fase 4**: movimientos de stock por canal, umbral de stock crítico funcionando.
- **Fase 5**: `/store/<slug>` sin sesión refleja el orden/visibilidad configurados.
- **Fase 6**: carrito sin sesión → login Google → zona de envío → pago MP sandbox → webhook marca `paid` y descuenta `stockOnline` → orden en "Mis pedidos".
- **Fase 7**: cambio de estado dispara email y se refleja en "Mis pedidos" con tracking; alta manual de un pedido con un ítem de catálogo y un ítem personalizado (con imagen de referencia) en la misma orden; la clasificación Catálogo/Personalizado/Mixto se calcula bien en los tres casos.
- **Fase 8**: cliente de Fase 6 aparece listado con historial correcto.
- **Fase 9**: crear cartera, registrar un ingreso manual vinculado a un pedido, verificar que ese pedido puede avanzar de estado sin haber pasado por MP, y que el movimiento no se puede borrar mientras esté vinculado; ganancia bruta de un pedido coincide con `unitCostSnapshot` de sus ítems.
- **Fase 10**: números del dashboard coinciden con los pedidos y movimientos cargados; reordenar/ocultar tarjetas del dashboard persiste tras recargar.

## Archivos críticos

- `backend/src/db/schema.ts`
- `backend/src/plugins/auth.ts`
- `backend/src/modules/homeSections/service.ts`
- `backend/src/modules/payments/service.ts`
- `backend/src/modules/finance/service.ts`
- `frontend/src/features/catalog/HomeSectionsRenderer.tsx`
- `frontend/src/features/admin/pages/HomeSectionsPage.tsx`
- `frontend/src/features/admin/components/DashboardCustomizable.tsx`
- `frontend/src/features/portal/pages/MyOrdersPage.tsx`
- `packages/shared/src/schemas/order.ts`
- `docker-compose.yml`

## Estrategia de unificación con Bordart-admin

No se fusiona código: bordart-admin arrastra deuda arquitectónica (sin RLS, service-role key en todos lados, sesión = id crudo en cookie, sin multi-tenancy, sin gateway de pago real) que fabbric ya decidió evitar de entrada. La unificación real ocurre **después del MVP**, como una migración de datos, no como un merge de repos:

1. Escribir un script one-off que mapea las tablas de Bordart (`productos`, `producto_variantes`, `categorias`, `colecciones`, `clientes`, `pedidos`, `pedido_items`, `movimientos_financieros`, `carteras`) hacia el schema multi-tenant de fabbric.
2. Crear una fila en `organizations` para "Bordart" como **tenant #1**.
3. Este proceso sirve además como prueba de integración real: si el schema de fabbric no puede absorber los datos reales de una tienda que ya opera, es señal de un gap en el modelo antes de vender el SaaS a un segundo cliente.

## Hoja de ruta hacia un SaaS productizable (post-MVP)

Puntos que el plan de 10 fases no cubre todavía porque son necesarios para *vender* fabbric a múltiples tenants, no para que un tenant funcione:

- **RLS en Postgres como defensa en profundidad.** Hoy el aislamiento de tenant depende de que cada query del backend incluya `WHERE org_id` (vía `lib/tenant.ts`). Antes de aceptar el segundo tenant pagante, agregar políticas RLS reales en Supabase como segunda barrera, no solo disciplina en el código de aplicación.
- **Mercado Pago por tenant (marketplace).** El MVP usa UN access token de MP a nivel plataforma — la plata de todas las tiendas entraría a una sola cuenta. Antes de que una segunda tienda venda de verdad: modo marketplace de MP — cada dueño conecta SU cuenta vía OAuth ("Conectar Mercado Pago" en la config de tienda), token por tenant en `catalog_configs` (cifrado), y opcionalmente `marketplace_fee` como comisión de fabbric por venta. Detectado al planificar T6 (pregunta del usuario, 2026-07-08).
- **Facturación/suscripción por tenant.** Los pagos de Mercado Pago del plan actual son pagos de *clientes finales* a *cada tienda* — falta el cobro de fabbric a cada tienda por usar la plataforma (planes, límites por plan, estado de mora/suspensión de `organizations.active`).
- **Onboarding self-serve.** Hoy `organizations` se crea a mano (Fase 1). Para vender sin intervención manual hace falta un flujo de alta de tenant (signup → crear org → invitar staff → configurar catálogo inicial).
- **Portal Super Admin completo.** El plan actual lo deja fuera; para operar varios tenants en producción (soporte, impersonar sesión de un tenant, suspender cuentas morosas) va a hacer falta antes de escalar más allá de 2-3 clientes.
- **Observabilidad por tenant.** Con un solo codebase sirviendo a varios negocios, un error o lentitud en un tenant no debe pasar desapercibido — logging/error tracking (ej. Sentry) con `orgId` como tag desde el día 1 del backend, no agregado después.

No forma parte de las 10 fases del MVP; se recomienda encararlo recién cuando exista un segundo tenant real además de Bordart, para no sobre-construir infraestructura de "SaaS" antes de necesitarla.
