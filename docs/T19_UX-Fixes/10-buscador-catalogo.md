# 10 — Buscador y paginación en la tienda pública

**Estado:** ✅ Completa (2026-07-30)

## Qué se cambia

Se agrega una forma de encontrar productos en la tienda pública más allá de los primeros 8 de cada sección del home: como mínimo, un link "Ver todos en [categoría]" cuando una sección supera ese límite; idealmente, un endpoint público de catálogo con paginación (y opcionalmente búsqueda por nombre) que reemplace el techo duro actual.

## Referencia visual

**Ninguna pantalla del mockup cubre esto** — las 4 pantallas mockeadas son todas del panel admin. El buscador que aparece en Pantalla 2 (`🔍 Buscar producto...`) es el buscador interno del admin para gestionar su propio listado de productos (ya cubierto por `02-productos-con-tabs.md`), no el buscador de la tienda pública que necesita el comprador — son dos problemas distintos que no hay que confundir. Esta tarea va más allá de lo que el mockup ilustra.

## Referencia en T18

- `03-catalogo-publico.md` 🔴 — "No existe buscador, ni filtros, ni forma de ver todos los productos de una categoría — solo lo que entra en 8 tarjetas".

## Archivos a modificar

- `backend/src/modules/public/routes.ts` — nuevo endpoint o extensión de uno existente para listar productos de una categoría/colección con paginación (hoy `GET /public/:slug/home` trae como máximo 8 por sección, sin cursor ni offset).
- `frontend/src/features/store/pages/CatalogHomePage.tsx` — agregar el link "Ver todos" cuando una sección tiene más de 8 productos.
- Nueva página en `frontend/src/features/store/pages/` (ej. `CategoryPage.tsx`) para la vista de "todos los productos de esta categoría", si se implementa la versión completa y no solo el link.
- `frontend/src/router.tsx` — nueva ruta pública (ej. `/store/:slug/c/:categorySlug`) si se agrega la vista completa.
- `frontend/src/features/store/types.ts` — tipos para la respuesta paginada.

## Criterio de completado

- Una sección con más de 8 productos deja de truncar en silencio — como mínimo, muestra el link "Ver todos" y ese link lleva a una pantalla que sí lista el resto.
- `tsc --noEmit` limpio en los 3 workspaces.
- Verificado con una categoría de prueba con más de 8 productos, confirmando que los productos 9+ son alcanzables desde la tienda pública sin conocer su URL directa de antemano.

## Notas

- Es la tarea de mayor esfuerzo de todo T19 (requiere un endpoint nuevo, no solo UI) — por eso quedó en Sprint 3 ("Más adelante") tanto en `06-ux-review.md` como en el orden de esta carpeta.
- Un buscador por nombre (no solo "ver todos por categoría") es una mejora adicional que T18 menciona como posible pero no exige — confirmar alcance con el usuario antes de implementar: ¿alcanza con resolver el techo de 8 por categoría, o hace falta búsqueda libre por texto?
- No confundir con `02-productos-con-tabs.md`: esa tarea es el buscador del ADMIN sobre sus propios productos (uso interno); esta tarea es el buscador del COMPRADOR sobre el catálogo público (`/public/:slug/*`, sin auth).

## Resultado

Alcance confirmado por el usuario: **Opción A únicamente** — link "Ver todos" + página paginada por categoría, sin buscador de texto libre (queda anotado como posible mejora futura, no implementado).

- **`backend/src/modules/public/routes.ts`**:
  - `GET /public/:slug/home` ahora devuelve `refType` y `totalCount` (la cantidad real antes de recortar a 8) en cada sección — `totalCount` sale gratis: ya se computaba `matching.length` en memoria antes del `.slice(0, 8)`, no hizo falta ninguna consulta extra a la DB.
  - **Endpoint nuevo** `GET /public/:slug/categories/:categorySlug/products?page=N` — paginado (`CATEGORY_PAGE_SIZE = 24`), mismo contrato de seguridad que el resto de `public/routes.ts` (solo `visibleInCatalog && status !== paused`, nunca `costPrice`/`stockLocal`/`orgId`). 404 si la categoría no existe o está inactiva. Solo cubre categorías, no colecciones — coherente con la ruta `/c/:categorySlug` y con el alcance acordado.
- **`HomeSectionsRenderer.tsx`** (componente compartido entre la tienda pública y el preview de `MyStorePage`/T19-07): `HsrSection` ganó `refSlug`/`refType`/`totalCount` opcionales, y el componente ganó un prop `storeSlug?` — el link "Ver todos →" solo se arma cuando `storeSlug` está presente, la sección es de categoría, y `totalCount > products.length`. `MyStorePage` deliberadamente NO pasa `storeSlug` (su preview es local/sin guardar — mostrar un link que te saca a la tienda real en medio de una edición sin guardar hubiera sido confuso), así que ahí nunca aparece — solo en la tienda pública real vía `CatalogHomePage`.
- **`CategoryPage.tsx`** (nueva, ruta `/store/:slug/c/:categorySlug`): título de la categoría, grilla de `ProductCard` (mismo componente que el home), paginación Anterior/Siguiente vía `?page=`, estados de carga/error/vacío consistentes con el resto de la tienda.
- **`store/types.ts`**: nuevo tipo `PublicCategoryProducts` para la respuesta paginada.

**Verificación real, en dos capas** (no solo `tsc`):
1. **Script automatizado contra el backend real** (categoría temporal + 9 productos en la org real, limpiada al final, mismo patrón que las pruebas anteriores de T19): **23/23 checks ✅** — cubre que el home reporta `totalCount: 9` pero solo 8 productos, `refType`/`refSlug` correctos, el endpoint paginado devuelve los 9 (incluido el "Producto 9" que el home nunca muestra), 404 para una categoría inexistente, y cero residuos después del cleanup.
2. **Verificación visual del usuario**, con otra categoría temporal ("Ver Todos Demo", 9 productos, dejada visible en `/store/eliathi-modas` para que la viera de verdad): confirmó el link "Ver todos →" junto al título de la sección en el home, y al clickearlo confirmó la URL `/store/eliathi-modas/c/ver-todos-demo` con los 9 productos listados. Datos de prueba borrados después (los 9 productos + la categoría), sin dejar residuos en la org real.

`tsc --noEmit` limpio en los 3 workspaces (`backend`, `frontend`, `shared`); `vite build` limpio.

Con esto se cierra el hallazgo 🔴 de `03-catalogo-publico.md` — el techo de 8 productos por sección deja de ser un límite duro e inescapable.
