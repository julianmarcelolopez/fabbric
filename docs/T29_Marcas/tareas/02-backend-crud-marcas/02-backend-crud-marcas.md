# Tarea 2 — Backend: CRUD de marcas

**Estado:** ✅ Hecha — compila sin errores propios; quedan los errores esperados de la Tarea 5 (backend público, fuera de este alcance).

**Depende de:** Tarea 1 (necesita la tabla `brands` y `products.brandId`).

## Objetivo (según `plan.md`, T29/02)

API de administración de marcas, funcionalmente idéntica a la de colecciones
(`../../analisis.md` sección 4), y actualizar los endpoints de producto para
que reciban `brandId` en vez de `brand` texto.

## Pasos

### 1. CRUD de `/admin/brands`

- [x] `backend/src/modules/brands/routes.ts` — clon de `collections/routes.ts`: `GET/POST/PATCH/DELETE /admin/brands`, `POST /admin/brands/:id/image`.
- [x] **Diferencia real con `collections` (no anticipada en el análisis):** el `DELETE` de marca no bloquea si hay productos — a diferencia de categoría (obligatoria, bloquea) o colección (m2m, cae por cascade), marca es opcional en `products`. Se agregó `onDelete: "set null"` a la FK `products.brandId` (`schema.ts`, migración `0025_nifty_virginia_dare.sql`), así que borrar una marca deja sus productos sin marca en vez de bloquear o cascadear.
- [x] Registrado en `src/index.ts`, entre `collectionsRoutes` y `productsRoutes`.

### 2. Schemas compartidos

- [x] `packages/shared/src/schemas/brand.ts` (nuevo) — mismo patrón que `collection.ts`: `brandSchema`, `createBrandSchema`, `updateBrandSchema`. Exportado desde `packages/shared/src/index.ts`.
- [x] `packages/shared/src/schemas/product.ts` — `brand: brandText` reemplazado por `brandId: z.string().uuid().nullable()` en `productSchema`, y por `brandId` + `newBrandName` (opcionales) en `createProductSchema`, `updateProductSchema` y `altaRapidaSchema`.

### 3. Alta rápida y alta inline

- [x] `backend/src/modules/brands/service.ts` (nuevo) — `resolveBrandId(tx, orgId, { brandId, newBrandName })`: si viene `newBrandName`, busca por slug (mismo `slugify` que el admin, duplicado server-side en `backend/src/lib/slug.ts` — no existía antes) y reusa o crea la marca; si no, devuelve `brandId` tal cual. Acepta tanto `db` como una transacción (`DbOrTx`), a diferencia de `homeSections/service.ts` que solo se usa dentro de transacciones.
- [x] `products/routes.ts` — los tres handlers (`POST /admin/products`, `POST /admin/products/alta-rapida`, `PATCH /admin/products/:id`) usan `resolveBrandId` antes de insertar/actualizar. En `alta-rapida`, la resolución ocurre dentro de la misma transacción que crea el producto y la variante (atomicidad: si falla la creación de la marca, no queda un producto sin marca a medias).

## Cómo se verificó

- `npx tsc --noEmit` en `backend/`: 0 errores en `products/routes.ts`, `brands/routes.ts`, `brands/service.ts`, `lib/slug.ts` y los schemas de `packages/shared`. Quedan 13 errores, los 13 esperados y ya documentados en `../../analisis.md` sección 3 (10 en `public/routes.ts`, 2 en `homeSections/routes.ts`, 1 en `variants/routes.ts`) — alcance de la Tarea 5, no de esta.
- No se probó todavía por HTTP en vivo (`docker compose up -d backend`) — el circuito real de alta/edición de marca y alta inline se verifica de punta a punta en la Tarea 3 (admin) y Tarea 4 (PWA), que son quienes primero llaman a estos endpoints desde una UI.

## Definition of Done

- [x] `/admin/brands` tiene el mismo comportamiento que `/admin/collections` (crear/editar/imagen/borrar, slug único por org) — con la diferencia documentada arriba (no bloquea el borrado).
- [x] `createProductSchema`/`updateProductSchema`/`altaRapidaSchema` ya no aceptan `brand` texto, aceptan `brandId` (+ alta inline vía `newBrandName` en `alta-rapida`, `POST` y `PATCH` de producto).

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 3 (admin), Tarea 4 (PWA) — ambas necesitan estos endpoints para armar el combo.
