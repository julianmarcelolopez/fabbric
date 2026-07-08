# T2 — Catálogo base (Fase 2 de docs/plan.md)

## Objetivo de la fase

Que un vendedor pueda armar su catálogo completo desde el Portal Admin: categorías, colecciones, productos con variantes talle/color (stock online/local separado) e imágenes, con **preview en vivo a nivel producto** mientras edita. Todo scoped por tenant — esta fase es el primer uso real de `requireOrgId` con datos de negocio.

Criterio de verificación de la fase (de `docs/plan.md`): *2 categorías, 2 colecciones, producto en ambas colecciones con variantes talle/color y stock online/local distinto; preview en vivo*.

## Decisiones que marcan esta fase

- **Corrección al plan detectada al planificar**: `products` no tenía precio de venta (solo `costPrice` interno y `priceOverride` en variantes). Se agregó **`price`** (precio base) a `products` — sin esto no hay checkout posible en T6. Ya reflejado en `docs/plan.md`.
- **Slugs únicos por tenant, no globales**: `unique(orgId, slug)` en categorías y colecciones — dos tiendas pueden tener ambas una categoría "remeras".
- **Aislamiento de tenant es parte del DoD de cada tarea de endpoints**: además de probar el CRUD, cada tarea verifica que un admin de otra org **no ve ni puede tocar** los datos (404, no 403, para no filtrar existencia).
- **Reglas de borrado** (inspiradas en lo validado por bordart-admin):
  - Categoría con productos → **bloquear** (400 con mensaje claro), no cascade.
  - Colección → borrar libre; solo cae la relación m2m (`product_collections` cascade).
  - Producto → cascade a variantes, imágenes (filas **y** archivos en Storage) y m2m.
- **Storage**: bucket `product-images` (ya existe desde T0), paths `{orgId}/{productId}/{uuid}.{ext}` — el orgId en el path permite limpiar/tarifar por tenant a futuro. El backend es el único que escribe (patrón byos: multipart → backend → Storage con secret key); el frontend solo lee URLs públicas.
- **Precios como enteros en centavos** (`integer`), no `numeric` con decimales — evita errores de redondeo flotante y es lo que Mercado Pago espera multiplicar/dividir en T6. El frontend formatea.
- **Sin endpoints públicos todavía**: todo bajo `/admin/*`. La tienda pública lee el catálogo recién en T5.

## Cómo trabajamos esta carpeta

Igual que T0/T1: cada tarea es un archivo con objetivo, pasos y Definition of Done propio. Se ejecutan en orden, una por turno; al cerrarla se marca acá y en el archivo.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-schema-catalogo.md](01-schema-catalogo.md) — Tablas del catálogo + schemas Zod compartidos | — | ✅ Hecha |
| 2 | [02-categorias-colecciones.md](02-categorias-colecciones.md) — CRUD de categorías y colecciones | 1 | ✅ Hecha |
| 3 | [03-productos-variantes.md](03-productos-variantes.md) — CRUD de productos, variantes y m2m colecciones | 1, 2 | ✅ Hecha |
| 3b | [03b-swagger-openapi.md](03b-swagger-openapi.md) — Swagger/OpenAPI (extra, pedido del usuario) | 3 | ✅ Hecha |
| 4 | [04-imagenes.md](04-imagenes.md) — Upload de imágenes a Storage (+ reorder + delete) | 3 | ✅ Hecha |
| 5 | [05-admin-catalogo-frontend.md](05-admin-catalogo-frontend.md) — Páginas admin: categorías, colecciones, productos | 2, 3, 4 | ✅ Hecha |
| 6 | [06-preview-producto.md](06-preview-producto.md) — Preview en vivo a nivel producto (split pane) | 5 | ✅ Hecha |
| 7 | [07-verificacion-final.md](07-verificacion-final.md) — Definition of Done de T2 | 1-6 | ✅ Hecha |

Las tareas 1-4 son backend (cada una se cierra con tests HTTP reales contra los contenedores, como en T1); la 5 y 6 son frontend; la 7 cierra la fase con el criterio del plan + chequeo en navegador del usuario.

## Recordatorios operativos (gotchas de fases anteriores)

- Deps nuevas en backend/frontend → `docker compose build <svc>` + `up -d --renew-anon-volumes <svc>`.
- Cambios de schema → **`npm run db:generate` + `npm run db:migrate`** desde `backend/` (los SQL quedan versionados en `supabase/migrations/`; `db:push` ya no se usa — decisión del usuario, 2026-07-07, aplicada con baseline `0000_init_t0_t2.sql`).
- Tests de API con la secret key → scripts Node (PowerShell dispara la protección anti-navegador de Supabase).
- **Toda ruta nueva declara `schema`** (tags/summary/security + body/params desde `@fabbric/shared`) — alimenta Swagger en `/docs` y valida en la capa de ruta (ver tarea 3b).
- No commitear nada salvo pedido explícito del usuario (sigue sin haber primer commit).

## Próximo paso al cerrar T2

**T3 — Secciones del home** (`docs/plan.md`, Fase 3): `home_sections` con reorder + toggle y preview a nivel home — el patrón estrella heredado de Bordart.
