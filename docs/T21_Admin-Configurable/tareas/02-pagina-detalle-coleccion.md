# 02 — Página de detalle de colección

**Estado:** ✅ Completa (2026-08-01)

## Qué se implementa

Una página pública nueva para ver los productos de UNA colección (`/store/:slug/col/:collectionSlug`), y el endpoint público que la alimenta — hoy no existe ninguno de los dos.

## Por qué existe (referencia a T20/08)

Fila "Página de detalle de colección" de la tabla de `docs/T20_UX-Store/tareas/08-admin-configurable.md`: en T20/04 (`CategoriesIndexPage.tsx`), las cards de colección **no son clickeables a propósito** — se documentó explícitamente que no existe ninguna página de destino en toda la tienda, y que simular un link a una página inexistente sería peor que no tener link. Esta tarea cierra ese hueco.

## Cambios de backend requeridos

- **Endpoint nuevo**: `GET /public/:slug/collections/:collectionSlug/products`, mismo contrato y mismo shape de respuesta que el ya existente `GET /public/:slug/categories/:categorySlug/products` (T19/10, en `backend/src/modules/public/routes.ts`) — paginado (`CATEGORY_PAGE_SIZE`), mismo `productFilter` (visible, no pausado), mismo patrón de `firstImages`. La única diferencia real es la fuente: en vez de `products.categoryId`, filtrar por `productCollections` (join `productCollections` → `products`, igual que ya hace el bloque de colecciones dentro de `GET /public/:slug/home`).
- **Sin schema nuevo, sin migración** — `collections` y `productCollections` ya existen tal cual se necesitan.

## Cambios de frontend requeridos

- **Decisión del usuario**: no se crea `CollectionPage.tsx` como archivo separado — se reusa `CategoryPage.tsx` (T20/05) con una prop `mode="collection"` (o equivalente), mismo layout/paginación/`ProductCard`, evita duplicar código que ya funciona. El componente pasa a elegir el endpoint (`/categories/:slug/products` vs `/collections/:slug/products`) y el link del breadcrumb según el modo.
- **Ruta nueva** en `frontend/src/router.tsx`: `{ path: "col/:collectionSlug", element: <CategoryPage mode="collection" /> }` (o el mecanismo de props que corresponda dentro de react-router — a resolver en la implementación), hermana de `c/:categorySlug`.
- **`CategoriesIndexPage.tsx`** (T20/04): las cards de `.col-card` pasan de `<div>` a `<Link to={`/store/${slug}/col/${c.refSlug}`}>`, con el link "Ver colección →" del mockup que T20/04 había omitido a propósito por no tener destino.
- **`frontend/src/features/store/types.ts`**: tipo `PublicCollectionProducts`, análogo a `PublicCategoryProducts`.

## Archivos a modificar

- `backend/src/modules/public/routes.ts`
- `frontend/src/features/store/pages/CategoryPage.tsx` (adaptar para `mode="collection"`, no se crea archivo nuevo)
- `frontend/src/router.tsx`
- `frontend/src/features/store/pages/CategoriesIndexPage.tsx`
- `frontend/src/features/store/types.ts`

## Criterio de completado

- Clickear una card de colección desde `/store/:slug/categorias` lleva a una página real con los productos de esa colección, paginados igual que una categoría.
- Una colección sin productos muestra el mismo estado vacío que ya usa `CategoryPage.tsx`, no un error.
- `tsc --noEmit` limpio; verificado en navegador con una colección real con productos.

## Notas y dependencias

- **Depende de `01`** — sin `imageUrl` en `collections`, el banner de esta página usa el mismo placeholder de color que ya está resuelto en T20 (no es bloqueante, pero da mejor resultado si `01` ya está hecha primero).
- Independiente de `03`, `04`, `05`, `06`, `07`.

## Resultado

**Backend**: `GET /public/:slug/collections/:collectionSlug/products` nuevo en `backend/src/modules/public/routes.ts`, mismo contrato exacto que el de categorías (T19/10) — paginado con `CATEGORY_PAGE_SIZE`, mismo criterio public-safe (visible, no pausado), mismo patrón de `firstImages`. Única diferencia real: el `productFilter` hace `innerJoin(productCollections, ...)` en vez de filtrar por `products.categoryId` directo (mismo join que ya usaba el bloque de colecciones dentro de `GET /public/:slug/home`). Devuelve `{ collection: {...} }` en vez de `{ category: {...} }` — mismos tres campos (`name`, `slug`, `imageUrl`).

**Frontend**: `CategoryPage.tsx` ganó `mode?: "category" | "collection"` (default `"category"`, así que la ruta existente `c/:categorySlug` no cambia nada). Con `mode="collection"` lee `collectionSlug` de los params en vez de `categorySlug`, arma el fetch contra el endpoint nuevo, y normaliza `data.collection ?? data.category` a una variable `item` común para el resto del render (banner, breadcrumb) — el resto del componente (toolbar, grilla, paginación) es 100% el mismo código para ambos modos, sin ningún `if` extra ahí. Textos condicionales solo donde hacía falta: error 404 ("esta categoría" / "esta colección"), breadcrumb ("Categorías" / "Colecciones"), estado vacío.

Ruta nueva `col/:collectionSlug` en `router.tsx`, hermana de `c/:categorySlug`, ambas apuntando al mismo `<CategoryPage/>`. `CategoriesIndexPage.tsx`: las cards de `.col-card` pasaron de `<div>` a `<Link to=".../col/:slug">`, y se agregó el link "Ver colección →" (`.col-link`, tomado del mockup) que T20/04 había omitido a propósito por no tener destino — ahora sí lo tiene.

**Verificación real de punta a punta** (`backend/t21-02-collection-page.mjs`, queda en el repo sin trackear): admin *staff* temporal, se creó una colección real con 2 productos reales de Eliathi Modas asignados (`PUT /admin/products/:id/collections`) y una segunda colección vacía. Se confirmó: la colección con productos devuelve exactamente esos 2 productos paginados con los datos correctos; la colección vacía devuelve `totalCount: 0`, `products: []`, `totalPages: 1` con **200**, no error (esto es justo lo que `CategoryPage.tsx` necesita para mostrar el estado vacío en vez de romper); una colección inexistente devuelve **404**, no 500. 16/16 checks en verde, sin residuos en la DB (colecciones, `product_collections` y `home_sections` asociadas borradas al final).

`tsc --noEmit` limpio en `backend/` y `frontend/`; `vite build` limpio. **Pendiente**: verificación visual del usuario — crear/usar una colección real con productos desde el admin, clickear su card en `/store/eliathi-modas/categorias` (tab Colecciones) y confirmar que lleva a la página con los productos, paginados y con el mismo estilo que una categoría.
