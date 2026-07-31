# 02 — Productos con tabs (Categorías / Colecciones / Stock)

**Estado:** ✅ Completa (2026-07-30)

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

## Resultado

Implementado con los criterios que definió el usuario antes de arrancar: filtrado 100% client-side (sin tocar el backend) y rutas viejas redirigiendo en vez de desaparecer.

- **`ProductsPage.tsx`** reescrita: tabs "Todos los productos / Categorías / Colecciones / Stock" controladas por `?tab=` en la URL (via `useSearchParams`, default = `lista` sin query param). La lista de productos (`ProductsList`, extraída como subcomponente) suma buscador por nombre + select de categoría + select de estado, todo filtrado con `useMemo` sobre la lista ya cargada por `GET /admin/products` — sin query params nuevos ni cambios de backend.
- **Badge "Sin variantes"** (ámbar) agregado en la columna Variantes cuando `variantCount === 0`. El badge **"Sin stock" del mockup se descartó para esta tarea**: `GET /admin/products` no devuelve agregado de stock (solo `variantCount`), y agregarlo hubiera requerido tocar el backend — fuera del criterio explícito del usuario ("no tocar el backend por ahora"). Queda pendiente para cuando se decida sumar ese dato al backend.
- **`TaxonomyManager.tsx`** y **`StockPage.tsx`** ganaron un prop opcional (`hideTitle` / `embedded`) para no duplicar su `<h1>` propio cuando se renderizan dentro de una tab — se siguen usando tal cual como páginas standalone en cualquier otro contexto que las necesite.
- **`CategoriesPage.tsx` y `CollectionsPage.tsx` se borraron** (dead code): eran wrappers de 5 líneas sobre `TaxonomyManager`, y una vez que `ProductsPage` renderiza `TaxonomyManager` directo en sus tabs, nada más los importaba. Confirmado con grep antes de borrar.
- **`router.tsx`**: las rutas `categories`, `collections` y `stock` ahora son `<Navigate to="/admin/products?tab=..." replace />` en vez de apuntar a una página propia — mantiene funcionando cualquier link/favorito viejo.
- **`AdminLayout.tsx` (sidebar) deliberadamente NO se tocó** — decisión del usuario de dejar `01-sidebar-rediseno.md` para el final, después de `02` y `07`, para no editar el sidebar dos veces. Los links viejos del sidebar (Categorías, Colecciones, Stock) siguen ahí por ahora y funcionan a través del redirect.

**Verificación real** (`tsc --noEmit` y `vite build` limpios primero; sin herramienta de browser automation en este entorno, verificado por el usuario en su navegador con screenshots):
- Tab "Categorías" (`?tab=categorias`): `TaxonomyManager` sin `<h1>` duplicado, alta/edición/borrado funcionando igual que antes.
- Tab "Todos los productos": buscador probado con "remera boxy" → filtró correctamente a un solo resultado, sin ida a la red.
- Tab "Colecciones": igual que Categorías, limpia.
- Tab "Stock": tabla completa (umbral, Mover/Historial) sin `<h1>Stock</h1>` duplicado.
- Redirect: `localhost:5173/admin/categories` → confirmado que termina en `localhost:5173/admin/products?tab=categorias`.
