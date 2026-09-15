# Tarea 1 — Backend: endpoints de Novedades y Ofertas

**Estado:** ✅ Hecha — verificada en vivo contra `docker compose up -d backend`.

**Depende de:** nada — no toca ninguna entidad nueva, solo lee `products` con un scope distinto al de categoría/colección/marca.

## Objetivo (según `plan.md`, T30/01)

Dos endpoints públicos nuevos, mismo contrato que
`GET /public/:slug/collections/:collectionSlug/products` pero sin scope de
taxonomía (no hay una entidad "Novedades"/"Ofertas" en la DB).

## Pasos

Todo en [backend/src/modules/public/routes.ts](../../../../backend/src/modules/public/routes.ts):

- [x] `isNotNull` vuelto a importar de `drizzle-orm` (línea 1).
- [x] `GET /public/:slug/novedades/products` — `scopeFilter` sin `categoryId`/`collectionId`. Orden: `resolveSort(query.sort ?? "nuevos")` — si no viene `?sort=` explícito, cae a `desc(products.createdAt)`; si viene `precio_asc`/`precio_desc`, lo pisa igual que en categoría.
- [x] `GET /public/:slug/ofertas/products` — mismo `scopeFilter` + `isNotNull(products.compareAtPrice)`.
- [x] Ambos reusan `extraFilterConditions(query)` y `productListQuery` tal cual — el filtro de marca por slug funciona sin ningún cambio adicional.
- [x] Ambos devuelven el mismo shape que categoría/colección **sin clave de grupo**: `{ products, page, pageSize, totalCount, totalPages, availableFilters }`.
- [x] Paginado con `CATEGORY_PAGE_SIZE` (24), sin recorte curado.
- [x] Reusan el mismo patrón `firstImages`/`imageOf` que el resto de los endpoints.

## Cómo se verificó

`docker compose up -d --build backend` (real) + `curl` contra el backend levantado:

- `GET /public/eliathi-modas/novedades/products` → 6 productos, orden exacto igual a `select ... order by created_at desc` corrido directo contra la DB.
- `GET /public/eliathi-modas/novedades/products?sort=precio_asc` → el orden por defecto queda pisado, precios ascendentes.
- `GET /public/eliathi-modas/novedades/products?marca=taverniti` → filtra correctamente a 1 resultado.
- `availableFilters` de Novedades viene completo (`talles`, `colores`, `marcas` con `{name, slug}`).
- `GET /public/eliathi-modas/ofertas/products` → devuelve solo el único producto con `compareAtPrice` no nulo, con el precio y el precio tachado correctos.
- Org de prueba sin ningún producto en oferta → `GET .../ofertas/products` devuelve `{ products: [], totalCount: 0, ... }`, sin error (creada y borrada al toque, no queda residuo).
- `npx tsc --noEmit` limpio en `backend/`.

## Definition of Done

- [x] `GET /public/:slug/novedades/products` devuelve productos ordenados por más nuevos, paginados, con los mismos filtros que categoría.
- [x] `GET /public/:slug/ofertas/products` devuelve solo productos con precio tachado.
- [x] Backend compila limpio.

## Dependencias

- **La bloquean:** nada.
- **Bloquea:** Tarea 2 (frontend necesita estos endpoints).
