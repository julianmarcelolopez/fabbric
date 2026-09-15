# Tarea 5 — Backend público: filtros por marca + endpoint de marca

**Estado:** ✅ Hecha — verificada en vivo contra `docker compose up -d backend`.

**Depende de:** Tarea 1 (necesita `brands`/`brandId`). No depende de las Tareas 2-4 — es independiente del admin/PWA, solo lee lo que la Tarea 1 dejó migrado.

## Objetivo (según `plan.md`, T29/05)

La tienda pública lee marca desde la tabla `brands`, no desde texto.

## Ajuste de alcance decidido al implementar (importante)

El plan original bundleaba dos cambios en esta tarea: (1) leer la marca desde
`brands` en vez de texto, y (2) cambiar el contrato público — `brand` de
string a `{name, slug}`, y `?marca=` de nombre a slug. **Se separaron**: el
storefront (`CategoryPage.tsx`, `ProductCard.tsx`, etc.) todavía consume el
contrato viejo (string, filtro por nombre) y no se toca hasta la Tarea 6 —
cambiar el contrato ahora sin tocar el frontend habría roto visualmente la
tienda pública en vivo (`fabbric.aivance.cloud`) durante el tiempo entre esta
tarea y la 6.

Se implementó la versión acotada: el backend ya lee todo desde `brands`
(fuente única, sin más texto duplicado/con errores de tipeo), pero **el
contrato hacia afuera no cambia** — `brand` sigue siendo un string (el
nombre), `?marca=` sigue matcheando por nombre. El cambio a slug (decisión 7
de `../../analisis.md`) se hace junto con la Tarea 6, en el mismo paso que
actualiza el frontend para consumirlo.

**Excepción:** el endpoint nuevo (`/brands/:brandSlug/products`) sí nace con
slug desde el arranque — no tiene una versión "vieja" que romper, y es
justamente lo que la Tarea 6 va a necesitar.

## Pasos

Todo en `backend/src/modules/public/routes.ts`:

- [x] `brandNameCondition()` (nueva) — reemplaza `eq(products.brand, query.marca)` por una subquery correlacionada contra `brands` (`products.brandId = brands.id AND brands.orgId = products.orgId AND brands.name = marca`). Sigue matcheando por **nombre**, a propósito (ver ajuste de alcance arriba).
- [x] `/public/:slug/home` — los dos `select` (categoría/colección) suman `.leftJoin(brands, ...)`, `brand: products.brand` → `brand: brands.name`.
- [x] `/public/:slug/categories/:categorySlug/products` — mismo cambio en `rows`; la distinct de `marcas` pasa de `selectDistinct(products.brand) + isNotNull` a `selectDistinct(brands.name)` con `innerJoin(brands)` (el inner join ya excluye los productos sin marca, no hace falta el `isNotNull` aparte).
- [x] Mismo patrón en `/public/:slug/collections/:collectionSlug/products`.
- [x] `/public/:slug/products/:id` (ficha pública) — mismo `leftJoin` + cambio de campo.
- [x] `backend/src/modules/homeSections/routes.ts` (preview de secciones del home en el admin) — mismo cambio, 2 queries.
- [x] `backend/src/modules/variants/routes.ts` (`by-barcode`, lo usa la PWA al escanear) — mismo cambio, 1 query.
- [x] Nuevo endpoint `GET /public/:slug/brands/:brandSlug/products` — clon de `/collections/:collectionSlug/products`, `scopeFilter` por `eq(products.brandId, brand.id)` en vez de la m2m de colecciones. Nace con `brand: {name, slug, imageUrl}` en la respuesta (no hay contrato viejo que preservar acá).
- [x] Import `isNotNull` sacado de `public/routes.ts` (quedó sin uso tras el cambio).

## Cómo se verificó

`docker compose up -d --build backend` (real, no `npm run dev` suelto) +
`curl` contra el backend levantado:

- `GET /public/eliathi-modas/home` → el producto con marca real (Taverniti) devuelve `brand: "Taverniti"` (string, contrato sin cambios).
- `GET /public/eliathi-modas/categories/remeras/products` sin filtro → `availableFilters.marcas: ["Taverniti"]`.
- Mismo endpoint con `?marca=Taverniti` → filtra correctamente a 1 resultado (antes 3).
- `GET /public/eliathi-modas/brands/taverniti/products` (endpoint nuevo) → devuelve `brand: {name:"Taverniti", slug:"taverniti", imageUrl:null}`, el producto correcto, `availableFilters.talles/colores` poblados.
- `GET /public/eliathi-modas/brands/no-existe/products` → `404`.
- `GET /public/eliathi-modas/products/:id` (ficha pública) → `brand: "Taverniti"` correcto.
- `npx tsc --noEmit` en `backend/`: **0 errores** — quedó resuelto el total de 13 que dejó pendiente la Tarea 1 (10 en este archivo, 2 en `homeSections`, 1 en `variants`).

No se verificaron en vivo `by-barcode` ni el resto de endpoints admin-auth de este archivo (`variants/routes.ts`) — requieren un token de sesión; su verificación real ocurre en la Tarea 7, manejando la PWA de punta a punta.

## Definition of Done

- [x] Ningún endpoint de `public/routes.ts`, `homeSections/routes.ts` ni `variants/routes.ts` lee `products.brand` (ya no existe, Tarea 1) — todos leen `brands` vía join.
- [x] `GET /public/:slug/brands/:brandSlug/products` funciona igual que el de colecciones.
- [x] El filtro `?marca=` sigue funcionando (por nombre, sin romper el storefront actual) — pasa a slug en la Tarea 6.
- [x] Backend compila limpio (0 errores).

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 6 (storefront consume estos endpoints, y ahí se completa el pase a slug).
