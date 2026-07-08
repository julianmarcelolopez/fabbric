# Tarea 1 — Tablas del catálogo + schemas Zod compartidos

**Estado:** ✅ Hecha (2026-07-07)
**Depende de:** —

## Objetivo

Extender `backend/src/db/schema.ts` con las 6 tablas del catálogo y publicar sus schemas Zod en `@fabbric/shared`, dejando la base de datos lista para las tareas 2-4.

## Pasos

### Drizzle (`backend/src/db/schema.ts`)

Todas con `orgId` referenciando `organizations` (la regla de oro del plan):

- [x] `categories`: `id`, `orgId`, `name`, `slug`, `sortOrder` (int, default 0), `active` (default true), timestamps. `unique(orgId, slug)`.
- [x] `collections`: `id`, `orgId`, `name`, `slug`, `active`, timestamps. `unique(orgId, slug)`.
- [x] `products`: `id`, `orgId`, `categoryId` (FK, **not null**), `name`, `description` (text, default ""), `price` (int, centavos), `costPrice` (int nullable, centavos — interno), `status` (pgEnum `product_status`: `active`/`paused`/`out_of_stock`, default `active`), `visibleInCatalog` (default true), `sortOrder`, timestamps.
- [x] `product_collections` (junction m2m): `productId` + `collectionId` (PK compuesta), ambas FK con `onDelete: cascade`.
- [x] `product_variants`: `id`, `productId` (FK cascade), `orgId`, `sku` (nullable), `talle`, `color`, `stockOnline` (int, default 0), `stockLocal` (int, default 0), `priceOverride` (int nullable, centavos), timestamps. `unique(productId, talle, color)`.
- [x] `product_images`: `id`, `productId` (FK cascade), `orgId`, `storagePath`, `url`, `sortOrder`, `createdAt`.
- [x] `npx drizzle-kit push` aplicado — timestamps con `$onUpdate` para `updatedAt`

### Schemas Zod (`packages/shared/src/schemas/`)

- [x] `category.ts` — entidad + create/update; exporta también `slugSchema` reutilizado por collection
- [x] `collection.ts` — ídem
- [x] `product.ts` — entidad + create/update + `productStatusSchema` + `setProductCollectionsSchema` (para el PUT de colecciones de la tarea 3)
- [x] `variant.ts` — entidad + create/update
- [x] `productImage.ts` — entidad + `reorderImagesSchema` (el upload va por multipart)
- [x] Re-export en `index.ts`; typecheck limpio en shared, backend y frontend

## Definition of Done

- [x] `drizzle-kit push` aplicado; las 6 tablas + enum `product_status` verificados por `information_schema` (12/12 PASS)
- [x] Constraints verificadas con inserts reales y limpiados: `unique(orgId, slug)` → 23505, `unique(productId, talle, color)` → 23505, `categoryId` NOT NULL → 23502, y delete de producto cascadea a variantes
- [x] `tsc --noEmit` limpio en los tres workspaces
