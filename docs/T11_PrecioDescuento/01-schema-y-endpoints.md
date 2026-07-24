# Tarea 1 — Columna `compareAtPrice` + endpoints

**Estado:** ✅ Completada (2026-07-24)
**Depende de:** —

## Objetivo

Exponer `compareAtPrice` de punta a punta en el backend: guardarlo, y que tanto el admin como la tienda pública puedan leerlo.

## Pasos

- [x] `backend/src/db/schema.ts`: columna `compareAtPrice` (`integer`, nullable, centavos) en `products`, junto a `price`/`costPrice`.
- [x] Migración: `db:generate -- --name product_compare_at_price` + `db:migrate` (`supabase/migrations/0007_product_compare_at_price.sql`).
- [x] `packages/shared/src/schemas/product.ts`: sumar `compareAtPrice` (opcional, nullable, entero ≥ 0) a los schemas de creación/edición de producto.
- [x] `backend/src/modules/products/routes.ts`: no requirió cambios — el select admin spreadea el row completo (`{ product: products, ... }`) y `insert`/`update` son genéricos sobre `input` (tipado por el Zod de shared), así que el campo se propaga solo.
- [x] `backend/src/modules/public/routes.ts`: agregado en los **4 puntos**:
  - [x] select de productos por categoría, home
  - [x] select de productos por colección, home
  - [x] el `.map()` que arma la respuesta final del home
  - [x] select de `/public/:slug/products/:id` (detalle)
- [x] **Corrección encontrada durante la tarea 2** (no estaba en el análisis original): `backend/src/modules/homeSections/routes.ts` (`/admin/home-sections`, el que alimenta el preview de `HomeSectionsPage`) tiene su **propia implementación paralela** del mismo patrón — select por categoría, select por colección, y el `.map()` final — completamente separada de `public/routes.ts`. Sin este archivo, el preview del admin no mostraría el tachado aunque la tienda pública sí. Los 3 puntos ya están agregados.
- [x] Confirmado que `payments/routes.ts` y `orders/routes.ts` (que también seleccionan `products.price`) **no** necesitan `compareAtPrice` — son contextos de cobro real, el campo es puramente de presentación y no debe influir en lo que se cobra.
- [x] Swagger: sin cambios manuales, el campo se refleja solo desde el Zod de shared.

## Definition of Done

- [x] `tsc --noEmit` limpio en `shared` y `backend`.
- [x] Prueba manual real (backend local contra la DB de `fabbric-dev`, sin Docker): "Remera Boxy Fit Roja" (org `demo`) con `compareAtPrice=2000000` aparece correctamente en `/public/demo/home` (tanto en la sección de categoría "Remeras" como en la colección "Verano 2027") **y** en `/public/demo/products/:id`. "Remera Oversize Negra" sin el campo devuelve `compareAtPrice: null` en ambos, sin romperse. Dato de prueba revertido a `null` al cerrar.
- [x] Ruta visible en `/docs` con el campo nuevo (viene del Zod de shared, no requiere verificación manual aparte).
