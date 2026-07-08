# T3 — Secciones del home (Fase 3 de docs/plan.md)

## Objetivo de la fase

El patrón estrella heredado de Bordart: el vendedor arma la **portada de su tienda** como una lista ordenable que intercala categorías y colecciones como bloques, cada una con su toggle visible/oculto, y con **preview en vivo del home** actualizándose al lado mientras arrastra. El componente que renderiza el preview (`HomeSectionsRenderer`) es el mismo que va a usar la tienda pública en T5 — igual que hicimos con `ProductDetailView` en T2.

Criterio de verificación de la fase (de `docs/plan.md`): *lista de home mezclando categorías/colecciones, reorder, toggle, preview en vivo, persistencia tras recargar*.

## Decisiones que marcan esta fase

- **Referencia polimórfica sin FK**: `home_sections.refType` (`category`|`collection`) + `refId` no pueden ser una foreign key real (apuntan a dos tablas). La integridad se garantiza en la capa de aplicación: al crear se valida que el ref exista en la org, y **al borrar una categoría/colección se limpian sus filas de `home_sections`** (se modifican los DELETE de la tarea 2 de T2). El renderer igual saltea refs faltantes de forma defensiva.
- **`unique(orgId, refType, refId)`**: una misma categoría/colección no puede estar dos veces en el home → 409.
- **Productos de cada sección: automáticos en v1** — una sección muestra los productos visibles de esa categoría/colección (hasta 8, orden por `sortOrder`). La **curaduría manual** que tenía Bordart (`seccion_productos`, elegir a mano hasta 4 destacados) queda anotada como mejora post-T5 si se extraña — no agrandar esta fase.
- **Drag & drop nativo HTML5** (como Bordart), sin sumar `dnd-kit` todavía — una dependencia menos; si en T10 (dashboard personalizable) hace falta dnd-kit, se evalúa unificar ahí.
- **Solo secciones visibles y de refs activos aparecen en el preview/tienda** — el toggle `visible` de la sección es independiente del flag `active` de la taxonomía; ambos deben estar en verdadero para renderizar.

## Cómo trabajamos esta carpeta

Igual que T0-T2: cada tarea es un archivo con objetivo, pasos y Definition of Done. En orden, una por turno; al cerrar se marca acá y en el archivo.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-schema-home-sections.md](01-schema-home-sections.md) — Tabla `home_sections` + schema Zod | — | ✅ Hecha |
| 2 | [02-endpoints-home-sections.md](02-endpoints-home-sections.md) — Endpoints admin (CRUD + reorder + data del preview) | 1 | ✅ Hecha |
| 3 | [03-home-sections-page.md](03-home-sections-page.md) — `HomeSectionsPage` (lista drag & drop + toggle) | 2 | ✅ Hecha |
| 4 | [04-home-preview.md](04-home-preview.md) — `HomeSectionsRenderer` + preview en vivo del home | 3 | ✅ Hecha |
| 5 | [05-verificacion-final.md](05-verificacion-final.md) — Definition of Done de T3 | 1-4 | ✅ Hecha |

Tareas 1-2 backend (con suite de tests HTTP como siempre), 3-4 frontend, 5 verificación del usuario en navegador. Los datos cargados en T2 (Remera Oversize Negra, categorías `Remeras`/`Remeras Nuevas`, colecciones `Verano 2027`/`Ofertas`) son la base de prueba.

## Recordatorios operativos (gotchas acumulados)

- Cambios de schema → **`npm run db:generate` + `npm run db:migrate`** (SQL versionado en `supabase/migrations/`; nunca `db:push`).
- Toda ruta nueva declara `schema` (tags/summary/security + body/params de `@fabbric/shared`) — Swagger `/docs`.
- Deps nuevas en un contenedor → `docker compose build <svc>` + `up -d --renew-anon-volumes <svc>`.
- Los tests server-to-server **no cubren CORS** — las mutaciones nuevas se validan también en navegador (lección de T2: PATCH/PUT/DELETE bloqueados por el default de @fastify/cors).
- Tests de API con secret key → scripts Node, no PowerShell.
- Sin commits todavía (decisión del usuario) — sugerir en cada cierre de fase.

## Próximo paso al cerrar T3

**T4 — Stock** (`docs/plan.md`, Fase 4): `stock_movements` (historial tipo+delta por canal), alerta de stock mínimo, vista de stock crítico. Ahí el PATCH de stock de variantes pasa a registrar movimientos (nota ya dejada en el código en T2).
