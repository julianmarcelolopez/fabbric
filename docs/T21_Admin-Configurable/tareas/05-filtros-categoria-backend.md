# 05 — Filtros y orden reales en la página de categoría

## Qué se implementa

Parámetros de filtro (talle, color, marca) y de orden en el endpoint paginado de productos de categoría, y la conexión de la sidebar de filtros que T20/05 dejó construida visualmente pero deshabilitada.

## Por qué existe (referencia a T20/08)

Fila "Sort/filtros funcionales en categoría" de la tabla de `docs/T20_UX-Store/tareas/08-admin-configurable.md`: T20/05 documentó esto como *"la decisión más importante de toda la tarea"* — el endpoint de T19/10 solo pagina, no filtra ni ordena, así que implementar la sidebar completa hubiera significado UI que aparenta funcionar sin funcionar de verdad. Se optó por **Opción 3**: omitir la sidebar de filtros en V1, dejar solo banner + toolbar simplificado (contador + sort deshabilitado) + grilla + paginación, con el sort `<select>` explícitamente `disabled` para no simular una funcionalidad inexistente.

## Cambios de backend requeridos

- **Endpoint extendido**: `GET /public/:slug/categories/:categorySlug/products` (y, si `02` ya existe, el análogo de colección) gana querystring opcional:
  - `talle` (string) — filtra por `productVariants.talle` (exact match; el producto entra si TIENE alguna variante con ese talle y stock, a definir el criterio exacto de "disponible" al implementar).
  - `color` (string) — ídem con `productVariants.color`.
  - `marca` (string) — filtra por `products.brand` (exact match; `brand` ya es texto libre sugerido, no taxonomía, así que el filtro es sobre el valor tal cual existe hoy en los productos, no una lista curada nueva).
  - `precioMin` / `precioMax` (número, centavos) — **decisión del usuario: entra en esta ronda**, rango de precio con dos inputs en la sidebar (mín/máx). Filtra sobre `products.price` (o el precio efectivo de la variante si tiene `priceOverride` — a definir el criterio exacto al implementar, mismo tipo de decisión que ya resolvió `ProductDetailView.tsx` para el precio con descuento).
  - `sort` (enum: `precio_asc` | `precio_desc` | `nuevos` — evaluar si "más vendidos" tiene sentido sin datos de ventas agregadas fácilmente disponibles a este nivel; si no, dejarlo afuera y documentarlo).
  - Todos opcionales — sin querystring, el comportamiento es idéntico al actual (mismo orden `sortOrder, name`, sin filtrar).
- **Sin schema nuevo, sin migración** — todos los campos a filtrar (`talle`, `color`, `brand`) ya existen. El único campo que falta para armar la lista de OPCIONES de filtro (qué talles/colores/marcas existen realmente en esa categoría, para no mostrar un filtro de un valor que no tiene ningún producto) es una query adicional de valores distintos — evaluar si conviene devolverla en la misma respuesta (`availableFilters: { talles: string[], colores: string[], marcas: string[] }`) o en un endpoint aparte.

## Cambios de frontend requeridos

- **`frontend/src/features/store/pages/CategoryPage.tsx`** (T20/05): activar la sidebar de filtros — talle chips, color dots, marca, y rango de precio (dos inputs numéricos, min/max).
- Cada filtro actualiza el querystring de la URL (mismo patrón que `page` ya usa con `useSearchParams`) y dispara un nuevo fetch — **con debounce** para no disparar un request por cada click cuando se combinan varios filtros rápido.
- El `<select>` de orden (`.sort-select`, hoy `disabled` con título "Ordenar (próximamente)") pasa a estar habilitado y conectado a `sort`.
- CSS de la sidebar: revisar si `docs/T20_UX-Store/mockups/mockup_eliathi_categoria.html` (`.filters-sidebar`, `.filter-group`, `.talle-options`, `.talle-chip`, `.color-*`) ya tiene todo lo necesario tal como quedó documentado en T20/05 (nunca implementado en CSS real, solo en el mockup) — construirlo desde ahí, no desde cero.

## Archivos a modificar

- `backend/src/modules/public/routes.ts`
- `frontend/src/features/store/pages/CategoryPage.tsx`
- `frontend/src/features/catalog/catalog.css`
- `frontend/src/features/store/types.ts` (`PublicCategoryProducts`, si se agrega `availableFilters`)

## Criterio de completado

- Filtrar por talle y/o color y/o marca en una categoría real devuelve solo los productos que corresponden — verificado contra datos reales, no solo que la UI cambie de estado.
- Ordenar por precio (asc/desc) devuelve el orden correcto.
- Sin ningún filtro/orden aplicado, el comportamiento es idéntico al de hoy (paginación simple).
- La sidebar no muestra opciones de filtro que no tienen ningún producto detrás (o, si se decide no resolver eso en esta ronda, documentarlo explícitamente como limitación conocida).
- `tsc --noEmit` limpio; verificado en navegador combinando varios filtros a la vez con datos reales.

## Notas y dependencias

- Independiente de `01`, `02`, `03`, `04`, `06`, `07` — pero es **la tarea más compleja de T21**, la única que toca la lógica de un endpoint existente en vez de solo agregar campos.
- Mismo criterio de "no inventar": si "más vendidos" no tiene una fuente de datos razonable a mano en este endpoint, no se implementa con un criterio inventado (ej. orden aleatorio disfrazado) — se dejan las opciones de sort que sí tienen un cálculo real y se documenta la omisión.
