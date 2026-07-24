# Tarea 1 — Columna `brand` + endpoints

**Estado:** ✅ Completada (2026-07-24)
**Depende de:** —

## Objetivo

Exponer `brand` de punta a punta en el backend.

## Pasos

- [x] `backend/src/db/schema.ts`: columna `brand` (`text`, nullable) en `products`.
- [x] Migración: `db:generate -- --name product_brand` + `db:migrate` (`supabase/migrations/0008_product_brand.sql`).
- [x] `packages/shared/src/schemas/product.ts`: const reusable `brandText = z.string().min(1).max(60)`, aplicado como `brandText.nullable()` en `productSchema`, `brandText.nullable().optional()` en `createProductSchema`, `brandText.nullable()` dentro del `.partial()` de `updateProductSchema`.
- [x] `backend/src/modules/products/routes.ts`: confirmado que no requirió cambios.
- [x] `backend/src/modules/public/routes.ts`: agregado en los 4 puntos (select por categoría, select por colección, `.map()` final del home, select de detalle).
- [x] `backend/src/modules/homeSections/routes.ts`: agregado en los 3 puntos (mismo patrón).

## Definition of Done

- [x] `tsc --noEmit` limpio en `shared` y `backend`.
- [x] Prueba manual real (contra el backend en Docker, ya levantado por el usuario, y la DB real): "Remera Boxy Fit Roja" con `brand="Adidas"` aparece correcto en `/public/demo/home`, `/public/demo/products/:id`, `/admin/home-sections` **y** `/admin/products/:id`. "Remera Oversize Negra" sin marca devuelve `brand: null` en todos, sin romperse. Dato de prueba revertido a `null` al cerrar.
- [x] Validación confirmada de verdad: `PATCH /admin/products/:id` con `{"brand":""}` devuelve `400` (`"String must contain at least 1 character(s)"`) — confirma que el frontend (tarea 2) tiene que mandar `null`, no `""`, para un campo vacío.
- [x] Ruta visible en `/docs` con el campo nuevo.
