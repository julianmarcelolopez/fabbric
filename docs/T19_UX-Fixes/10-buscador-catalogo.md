# 10 — Buscador y paginación en la tienda pública

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
