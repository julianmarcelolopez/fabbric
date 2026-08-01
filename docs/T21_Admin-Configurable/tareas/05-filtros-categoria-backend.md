# 05 — Filtros y orden reales en la página de categoría

**Estado:** ✅ Completa (2026-08-01)

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

## Resultado

**Backend** (`backend/src/modules/public/routes.ts`): `productListQuery` (Zod, extiende el `pageQuery` de siempre) agrega `talle`/`color`/`marca`/`precioMin`/`precioMax`/`sort`, todos opcionales. Tres helpers compartidos por categorías y colecciones:
- `variantMatchCondition(talle, color)`: cuando se pasan los dos juntos, exige que **una misma variante** cumpla ambos (`exists` correlacionado sobre `product_variants`, con `stockOnline > 0`) — no "alguna variante con ese talle" + "alguna con ese color" por separado, que sería un resultado distinto y menos útil (decisión del usuario, criterio de "disponible" del punto 4).
- `extraFilterConditions`: arma talle/color + `marca` (`eq(products.brand, ...)`) + rango de precio (`gte`/`lte` sobre `products.price` únicamente, **sin `priceOverride`** — limitación conocida, documentada como tal).
- `resolveSort`: `precio_asc`/`precio_desc`/`nuevos` (`createdAt` desc); sin sort → el orden de siempre (`sortOrder, name`). "Más vendidos" quedó afuera — sin un join a `order_items` no hay una fuente de datos razonable a este nivel, se documenta como omisión en vez de simularlo.

`availableFilters` (`{talles, colores, marcas}`) se calcula con el **`scopeFilter` sin los filtros ya aplicados** (decisión del usuario: refleja toda la categoría/colección, no lo que queda tras filtrar) — talles/colores requieren `stockOnline > 0` en al menos una variante, marcas no (es un atributo del producto, no de la variante). Los dos endpoints (categoría de T19/10 y colección de `02`) ganaron exactamente el mismo tratamiento — mismos helpers, mismo shape de respuesta.

**Frontend** (`CategoryPage.tsx`, reescrito): sidebar de filtros (`talle-chips`, `color-dots`, rango de precio, `marca` como chips de selección única — **no checkboxes como el mockup**, porque el backend acepta una sola marca por request y un checkbox multi-select prometería algo que no hace) + sort real conectado. Los filtros viven en estado local ("draft", feedback instantáneo al clickear) que se sincroniza a la URL (mismo patrón que `page`) con **debounce de 300ms** — un `useEffect` con `setTimeout` que solo dispara después del último cambio, con guard para no re-disparar en el mount inicial. El fetch de datos depende de los valores YA en la URL (post-debounce), no del draft, así que solo se dispara un request por ráfaga de cambios, no uno por click. `goToPage` pasó de reemplazar todos los params a mergear sobre los existentes (antes perdía los filtros al cambiar de página). Cambiar de categoría/colección resetea todos los filtros. Se agregó "Limpiar filtros" cuando hay alguno activo.

Se extrajo `colorSwatchStyle`/el diccionario de nombres→hex de `ProductDetailView.tsx` a un módulo compartido (`frontend/src/features/catalog/colorSwatch.ts`) para reusarlo en los `color-dot` de la sidebar sin duplicar el diccionario.

**Verificación real con datos controlados** (`backend/t21-05-filters.mjs`, queda en el repo sin trackear): categoría temporal con 3 productos de variantes/precios/marcas conocidos (A: MarcaA $100 talle M/Rojo stock 5 + talle L/Rojo **stock 0**; B: MarcaB $200 talle M/Azul stock 3; C: MarcaA $300 talle S/Rojo stock 2) — permite predecir exactamente qué debería devolver cada filtro. 20/20 checks en verde, incluyendo los casos más delicados: `talle=M&color=Rojo` devuelve solo A (no la unión de "algún M" + "algún Rojo"), `talle=L` devuelve 0 productos (la única variante L no tiene stock), `availableFilters.talles` incluye S pero no L aunque el filtro activo sea `talle=M`, los 3 sorts en el orden correcto, y filtros combinados (marca+precio) devolviendo la intersección correcta. Sin residuos en la DB al terminar.

`tsc --noEmit` limpio en `backend/` y `frontend/`; `vite build` limpio. **Pendiente**: verificación visual del usuario combinando filtros en el navegador — la lógica de datos ya está probada exhaustivamente, falta confirmar la experiencia real (debounce percibido, chips reflejando el estado, sidebar en mobile).
