# Propuesta — Buscador de productos (tienda pública)

**Estado:** 📋 Propuesta — no implementada
**Relacionado con:** `T19_UX-Fixes/10-buscador-catalogo.md`, `T20_UX-Store/tareas/02-header-footer.md`

## Resumen

Hoy la tienda pública (`/store/:slug`) no tiene forma de buscar productos por nombre. El ícono de lupa (🔍) que aparece en el header desde T20 es **decorativo**: quedó con `disabled` y un comentario en el código a propósito, porque T19 evaluó agregar búsqueda de texto libre y el usuario confirmó en ese momento que alcanzaba con resolver el techo de 8 productos por sección (link "Ver todos") — la búsqueda quedó anotada como mejora futura, no implementada.

Esta propuesta define esa mejora futura: qué se construye, cómo se ve y qué hace falta tocar (backend y frontend) para que el ícono deje de ser decorativo.

## Contexto — qué existe hoy

- `GET /public/:slug/home` devuelve como máximo 8 productos por sección, sin ningún parámetro de búsqueda por texto.
- `GET /public/:slug/categories/:categorySlug/products?page=N` (agregado en T19-10) pagina productos **dentro de una categoría**, pero no busca por nombre ni cruza categorías.
- No existe ningún endpoint público que reciba un término de búsqueda.
- El header (`StoreLayout.tsx`) ya renderiza el ícono de lupa; solo falta la funcionalidad detrás.

## Objetivo

Que un comprador pueda encontrar un producto por nombre desde cualquier página de la tienda, sin depender de navegar categoría por categoría.

## Alcance

### Incluido
- Búsqueda por nombre de producto (coincidencia parcial, case-insensitive).
- Resultados en vivo (dropdown) a medida que el usuario escribe, con opción de ver el listado completo de resultados.
- Estados: reposo, activo/escribiendo, con resultados, sin resultados, cargando.
- Versión desktop (expansión in-place en el header) y versión mobile (overlay de pantalla completa).

### Fuera de alcance (para esta primera versión)
- Búsqueda por SKU, categoría, color o talle — solo nombre de producto.
- Corrección ortográfica / tolerancia a errores de tipeo ("fuzzy search").
- Historial de búsquedas o búsquedas populares (queda como posible mejora futura, no bloquea esta versión).
- Filtros combinados con la búsqueda (eso ya existe de forma separada en `categoria.html` del mockup de T20, no se mezcla acá).

## Diseño — patrón elegido

**Ícono que se expande in-place, con resultados en vivo, sin modal a pantalla completa en desktop.**

Ver `buscador.html` para el detalle navegable de cada estado. Resumen del comportamiento:

1. **Reposo**: el header se ve igual que hoy, con el ícono de lupa entre la navegación y el carrito.
2. **Clic en la lupa**: el ícono se transforma en un campo de texto (el nav se contrae), con foco automático. El campo tiene un ícono de cerrar (✕) para volver al estado de reposo.
3. **Escribiendo (2+ caracteres)**: aparece un panel debajo del campo con hasta 5 productos coincidentes — miniatura, nombre, precio — cada uno linkeando directo a la ficha de producto. Debajo de la lista, un link "Ver todos los resultados para «…»" que lleva a una página de resultados completa (paginada, mismo patrón que `CategoryPage.tsx`).
4. **Sin coincidencias**: el panel muestra un mensaje directo ("No encontramos productos con ese nombre") más 2-3 categorías destacadas como sugerencia, en vez de dejar el panel vacío.
5. **Mobile**: el ícono abre un buscador de pantalla completa (el header no tiene espacio para expandir in-place) — input arriba con foco automático, resultados como lista vertical, botón de cerrar.

### Por qué este patrón

- Mantiene el contexto (el usuario sigue viendo el header, no se lo saca de la página) — mejor para una decisión rápida como buscar un producto.
- Resultados en vivo evitan un viaje extra a una página de resultados vacía o irrelevante.
- Para un catálogo del tamaño del de Eliathi Modas, ir directo al producto desde el dropdown ahorra un clic frente a aterrizar siempre en un listado.

## Requerimientos técnicos

### Backend

- **Endpoint nuevo**: `GET /public/:slug/search?q=texto&page=N`
  - Búsqueda case-insensitive por nombre de producto (`ILIKE '%texto%'` o equivalente).
  - Mismo contrato de seguridad que el resto de `public/routes.ts`: solo `visibleInCatalog && status !== paused`, nunca expone `costPrice`/`stockLocal`/`orgId`.
  - Paginado, mismo tamaño de página que `CATEGORY_PAGE_SIZE` (24) para reutilizar el componente de paginación existente.
  - Devuelve también `totalCount` para poder mostrar "N resultados para «texto»".
  - Con `q` vacío o ausente, devuelve 400 (no tiene sentido "buscar todo").
- **Archivo a modificar**: `backend/src/modules/public/routes.ts`.

### Frontend

- `frontend/src/features/store/StoreLayout.tsx`: reemplazar el ícono de lupa `disabled` por el componente de búsqueda funcional (estado local para expandido/colapsado, debounce ~300ms sobre el input antes de pegarle al endpoint — mismo patrón que ya usa `CustomersPage.tsx` en el admin).
- Nuevo componente `frontend/src/features/store/components/SearchBar.tsx` (o similar) para no inflar `StoreLayout.tsx` — maneja el dropdown de resultados, el estado de carga y el de "sin resultados".
- Nueva página `frontend/src/features/store/pages/SearchResultsPage.tsx` para el listado completo de resultados (el link "Ver todos los resultados"), reutilizando `ProductCard` y el patrón de paginación de `CategoryPage.tsx`.
- `frontend/src/router.tsx`: nueva ruta pública, ej. `/store/:slug/buscar?q=texto`.
- `frontend/src/features/store/types.ts`: tipo `PublicSearchResults` (mismo shape que `PublicCategoryProducts`, con `query` agregado).
- `catalog.css`: clases nuevas para el campo expandido y el dropdown (reutilizar tokens existentes — `--navy`, `--coral`, `--off`, `--gray`, `--muted` — no se necesitan colores nuevos).
- Versión mobile: overlay a pantalla completa, probablemente como componente separado (`SearchOverlayMobile.tsx`) montado condicionalmente según breakpoint (768px, mismo que usa el resto de la tienda desde T20).

## Criterios de aceptación

- Desde cualquier página de la tienda pública, escribir un nombre de producto en el buscador y ver resultados coincidentes en menos de un segundo (con debounce, sin sobrecargar el backend con un request por tecla).
- Un término sin coincidencias muestra el estado vacío, nunca un panel en blanco ni un error.
- "Ver todos los resultados" lleva a una página paginada con el total real de coincidencias.
- Cada resultado del dropdown navega directo a la ficha de producto.
- Funciona en mobile como overlay de pantalla completa, sin romper el layout del header.
- `tsc --noEmit` limpio en los 3 workspaces.
- Verificado con un término que devuelve 0, 1 y más de 24 resultados (para probar el estado vacío, el caso simple y la paginación).

## Notas

- No confundir con el buscador interno del admin (`02-productos-con-tabs.md`), que es para que el dueño de la tienda gestione su propio listado — este documento es exclusivamente sobre el buscador que usa el comprador en la tienda pública, sin autenticación.
- Esta propuesta no incluye cambios de negocio (precios, stock, envíos) — es únicamente una forma nueva de encontrar productos que ya existen en el catálogo.
- Si en el futuro se agrega tolerancia a errores de tipeo o búsqueda por SKU, es una extensión de este mismo endpoint (parámetro adicional o motor de búsqueda distinto), no un rediseño del frontend.
