# Tarea 2 — Frontend: páginas Novedades y Ofertas

**Estado:** ✅ Hecha — verificada con Playwright real (7/7 PASS).

**Depende de:** Tarea 1 (necesita los endpoints públicos).

## Objetivo (según `plan.md`, T30/02)

Dos rutas nuevas, reusando [CategoryPage.tsx](../../../../frontend/src/features/store/pages/CategoryPage.tsx) en vez de crear un componente aparte — mismo criterio que T21/02 (category/collection) y T29/06 (brand) ya aplicaron.

## Pasos

### 1. Tipos

- [x] `store/types.ts` — `PublicProductListing` (nuevo): mismo shape que `PublicCategoryProducts` pero sin la clave `category` (no hay entidad que devolver).

### 2. `CategoryPage.tsx`

- [x] `Props.mode` → `Mode = "category" | "collection" | "brand" | "novedades" | "ofertas"`.
- [x] `data` (línea 77) y el genérico de `publicJson` (línea ~150) sumaron `PublicProductListing` a la unión.
- [x] Fetch: dos casos nuevos apuntando a `/public/${slug}/novedades/products` y `/public/${slug}/ofertas/products`, sin `itemSlug`.
- [x] **Refactor real hecho al implementar** (más grande que "sumar dos ternarias"): con 5 modos, las ternarias de 2-3 ramas repetidas en el error, el breadcrumb y el estado vacío se volvían difíciles de seguir. Se centralizó todo en un solo `MODE_TEXT: Record<Mode, { indexLabel, notFound, empty }>` — un solo lugar para los textos por modo, en vez de la misma lógica repetida 3 veces.
- [x] **Resolución de `item` por `mode`** (ya no por forma de `data`): `mode === "collection" ? data.collection : mode === "brand" ? data.brand : mode === "novedades" ? {name:"Novedades"} : mode === "ofertas" ? {name:"Ofertas"} : data.category`.
- [x] **Breadcrumb de 2 niveles** para Novedades/Ofertas (`MODE_TEXT[mode].indexLabel` es `null` para esos dos modos → no se renderiza el link del medio ni su separador).
- [x] **Bug real encontrado y corregido de paso** (no estaba en el alcance original, pero quedaba mal con el refactor): el mensaje de "sin productos" nunca se había actualizado para el modo `"brand"` de T29/06 — siempre decía "esta categoría" para una marca vacía. Ahora los 5 modos tienen su propio texto (`MODE_TEXT[mode].empty`).

### 3. Rutas

- [x] `router.tsx` — `{ path: "novedades", element: <CategoryPage mode="novedades" /> }` y `{ path: "ofertas", element: <CategoryPage mode="ofertas" /> }`, junto a las de categoría/colección/marca.

## Cómo se verificó

**Playwright real** (`frontend/t30-02-novedades-ofertas.mjs`, dos orgs descartables — una con productos de fechas/precios controlados, otra sin ninguna oferta para probar el estado vacío específico — no tocan datos de Eliathi, limpian todo al final):

1. `/novedades`: título "Novedades", breadcrumb `Inicio › Novedades` (2 niveles, confirmado por texto exacto), orden de 3 productos con `created_at` explícitos coincide con más-nuevo-primero.
2. `/ofertas` (misma org): breadcrumb de 2 niveles también; muestra únicamente el producto con `compareAtPrice`.
3. `/ofertas` en una org sin ninguna oferta: aparece el texto específico "Por ahora no hay productos en oferta." (no un mensaje genérico ni un error).
4. Cleanup: 0 filas huérfanas.

**7/7 PASS en la primera corrida.** `npx tsc --noEmit` limpio en `frontend/`.

## Definition of Done

- [x] `/store/:slug/novedades` y `/store/:slug/ofertas` funcionan con banner, breadcrumb correcto, y datos correctos de la Tarea 1.
- [x] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 3 (el header necesita estas rutas para poder linkear a ellas).
