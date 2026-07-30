# 02 — Productos con tabs (Categorías / Colecciones / Stock)

## Qué se cambia

`ProductsPage` deja de ser solo el listado de productos y pasa a tener 4 tabs: "Todos los productos" (el listado actual, con buscador y filtros por categoría/estado agregados), "Categorías" (contenido actual de `CategoriesPage`, reusando `TaxonomyManager`), "Colecciones" (ídem `CollectionsPage`) y "Stock" (contenido actual de `StockPage`). Las 3 rutas independientes (`/admin/categories`, `/admin/collections`, `/admin/stock`) dejan de existir como pantallas propias del sidebar.

## Referencia visual

Pantalla 2 (Productos) — tabs "Todos los productos / Categorías / Colecciones / Stock" en la parte superior, cada una con su propio contenido. La tab "Todos los productos" muestra además un buscador y badges de estado ("Sin variantes" en ámbar, "⚠️ Sin stock" en rojo) que hoy no existen en `ProductsPage`.

## Referencia en T18

- `01-flujo-critico.md` (mejora estructural) — "Unificar Categorías, Colecciones y Home en un único flujo guiado de 'publicar mi tienda' en vez de 3 pantallas de sidebar independientes y sin relación visual entre sí" (Home queda fuera de esta tarea, se resuelve en `07`).

## Archivos a modificar

- `frontend/src/features/admin/pages/ProductsPage.tsx` — agregar sistema de tabs, buscador, filtros, badges de estado (sin variantes / sin stock).
- `frontend/src/features/admin/pages/CategoriesPage.tsx` — su contenido se mueve a una tab; el archivo probablemente desaparece o queda como wrapper delgado.
- `frontend/src/features/admin/pages/CollectionsPage.tsx` — ídem.
- `frontend/src/features/admin/pages/StockPage.tsx` — ídem.
- `frontend/src/features/admin/components/TaxonomyManager.tsx` — sin cambios de lógica, se reutiliza tal cual dentro de las tabs.
- `frontend/src/router.tsx` — eliminar (o redirigir) las rutas `categories`, `collections`, `stock` como páginas independientes.
- `frontend/src/features/admin/AdminLayout.tsx` — sacar esos 3 links del sidebar (coordinar con `01`).

## Criterio de completado

- Las 4 tabs funcionan y muestran el mismo contenido/funcionalidad que las páginas viejas (nada se pierde, solo se reorganiza).
- El buscador y los filtros de la tab "Todos los productos" filtran correctamente contra `GET /admin/products` (confirmar si necesita query params nuevos o si el filtrado es client-side sobre la lista ya cargada).
- Los badges "Sin variantes" / "Sin stock" reflejan el estado real de cada producto (0 variantes, o todas las variantes con stock online + local en 0).
- `tsc --noEmit` limpio; verificado en navegador que las 4 tabs cargan sus datos correctamente.
- Las rutas viejas (`/admin/categories`, etc.) no rompen si alguien las tiene guardadas como favorito — decidir si redirigen a `/admin/products?tab=categorias` o simplemente dejan de existir.

## Notas

- El buscador y los filtros de categoría/estado en la tab "Todos los productos" son una mejora nueva respecto a lo que existe hoy (T18 no encontró un hallazgo específico sobre esto, es parte natural de tener una tabla más completa) — no confundir con el buscador del catálogo público de `10-buscador-catalogo.md`, que es un problema distinto (comprador, no admin).
- Los badges de estado ("Sin variantes", "Sin stock") son una forma temprana de mostrar el problema que documenta `04-aviso-sin-variantes.md` — si `04` ya está hecha, esta tarea puede simplemente reusar esa misma lógica de detección en vez de reimplementarla.
