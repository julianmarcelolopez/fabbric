# 05 — Página de categoría individual

**Estado:** ✅ Completa (2026-07-31)

## Qué se implementa

El rediseño de la página que ya existe desde T19/10 (`/store/:slug/c/:categorySlug`): banner de categoría, toolbar con filtros/orden/vista, sidebar de filtros, grilla de productos, paginación numerada.

## Referencia visual

`mockup_eliathi_categoria.html` completo — `.cat-banner`, `.toolbar` (`.filter-chip`, `.filter-active`, `.sort-select`, `.view-toggle`), `.filters-sidebar` (talle/color/precio/marca/estado), `.products-grid`, `.pagination`.

## Componentes a crear o modificar

- Category banner con imagen de fondo (nuevo — sujeto al gap de foto de categoría).
- Toolbar completo (nuevo).
- Filters sidebar completo: talle chips, color dots, price range, marca checkboxes, estado (nuevo).
- `ProductCard.tsx` — variante con talles disponibles on-hover (`.product-talles`), ya cubierta parcialmente en `03`.
- Paginación numerada (nuevo, reemplaza el Anterior/Siguiente actual de `CategoryPage.tsx`).
- `CategoryPage.tsx` (adaptar): mantiene el fetch a `GET /public/:slug/categories/:categorySlug/products` (T19/10), cambia el layout alrededor.

## Variables CSS que usa o define

Consume tokens de `01` y header/footer de `02`.

## Archivos a modificar

- `frontend/src/features/store/pages/CategoryPage.tsx`
- `frontend/src/features/catalog/catalog.css`
- `frontend/src/features/store/types.ts` (`PublicCategoryProducts` — sin cambios de forma necesarios salvo que se decida agregar paginación numerada real, que ya viene soportada por `totalPages`/`page` desde T19/10)

## Criterio de completado

- El banner de categoría muestra nombre y cantidad real de productos (`totalCount`, ya lo devuelve el endpoint de T19/10).
- La grilla y la paginación siguen funcionando igual que hoy (mismos datos, nuevo estilo) — verificar con una categoría de más de 24 productos (o forzar `pageSize` bajo temporalmente para probar) que la paginación numerada navega correctamente.
- **Los filtros de la sidebar (talle/color/precio/marca) y el sort del toolbar son honestos sobre su alcance real** — no deben aparentar filtrar/ordenar todo el catálogo si en V1 solo actúan sobre los productos ya cargados en la página actual, o si no están conectados a ningún estado todavía. Ver Notas: esta es la decisión más importante de toda la tarea.
- `tsc --noEmit` limpio; verificado en navegador.

## Notas y dependencias

- **Depende de `01` y `02`.** Independiente de `03`, `04`, `06`, `07`.
- **Gap central de esta tarea** (`analisis.md` sección 6): el endpoint de T19/10 solo pagina (`?page=N`), no acepta parámetros de filtro (`talle`, `color`, `precio`, `marca`) ni de orden (`sort`). Implementar la sidebar completa tal como la muestra el mockup, conectada a filtrado/orden real, **requiere extender ese endpoint — es un cambio de backend**, fuera del alcance declarado de T20. Antes de escribir código en esta tarea, decidir con el usuario una de estas opciones (no asumir ninguna):
  1. Implementar la UI completa pero **no funcional** (visual only, sin filtrar nada) — riesgo: parece roto/mentiroso si el usuario hace click y no pasa nada.
  2. Implementar un filtrado **client-side sobre la página actual únicamente** (los ≤24 productos ya cargados) — funciona pero no es "filtrar la categoría", es "filtrar lo que ya se ve".
  3. Omitir la sidebar de filtros de esta tarea (dejar solo banner + toolbar simplificado + grilla + paginación) y anotar los filtros como una tarea futura que sí toque el backend.
- Talles disponibles on-hover en la card (`.product-talles`): requiere que el listado de productos de categoría traiga los talles de cada producto — el endpoint actual de T19/10 no los incluye (trae `id/name/price/compareAtPrice/brand/imageUrl`, no variantes). Si se implementa esto, también cae en el mismo bloqueo de backend que los filtros — evaluar si se resuelve en la misma extensión de endpoint que la opción elegida arriba, o se omite ese detalle visual en V1.

## Resultado

**Decisiones del usuario (todas tomadas antes de escribir código)**:
1. Sidebar de filtros: **Opción 3** — omitida en V1. Queda documentada acá como trabajo futuro que requiere extender `GET /public/:slug/categories/:categorySlug/products` con parámetros de filtro (`talle`, `color`, `precio`, `marca`) — cambio de backend, fuera de T20.
2. Sort del toolbar: solo visual, `<select>` **deshabilitado** (`disabled`, mismo patrón que el ícono de búsqueda del header desde `02`) — se prefirió esto a un sort client-side que solo reordenaría los ≤24 productos ya cargados, porque hacer eso sin dejarlo clarísimo se sentiría como "ordenar mal" más que como una limitación honesta.
3. Talles on-hover en la card: omitido — el endpoint no trae variantes por producto, no se inventan datos.
4. Banner de categoría: mismo placeholder que las cards de `04` (`--tenant-primary` al 20% sobre `--navy`, vía `::before`), con nombre y cantidad real de productos.
5. Paginación numerada: implementada completa (`‹ 1 2 … N ›`, ventana de páginas con elipsis para categorías con muchas páginas).

**Implementación**:
- `frontend/src/features/store/pages/CategoryPage.tsx` reescrito — mismo fetch de siempre (`GET /public/:slug/categories/:categorySlug/products?page=N`, sin cambios de backend), layout nuevo: `.cat-banner` (full-bleed, mismo truco `calc(50%-50vw)` + cancelación de `padding-top` de `.store-main` que `.home-hero`/`.page-hero`) → `.toolbar` (sticky `top:72px`, igual que `.tabs-bar` de `04`) → `.content` (grilla + paginación).
- Grilla de productos: se reusa `.hsr-grid` (ya responsive con `auto-fill`) y el `ProductCard` de `03`, no se duplicó CSS de grilla nueva.
- `.category-page` pasó de `display:grid;gap:16px` a `display:flex;flex-direction:column;flex:1` — mismo patrón sticky-footer-fill de `.home-page`/`.categories-index` (evita el hueco vacío antes del footer en categorías con pocos productos).
- Paginación numerada: función `pageNumbers(current, total)` en el propio archivo — si `total <= 7` muestra todas, si no arma una ventana (`1`, `total`, `current-1..current+1`) con `…` para los saltos. Botones con `aria-label` en las flechas, deshabilitados en los extremos.
- Se dejó de usar `.store-back`/`.hsr-pagination`/`.category-page-pagelabel` en este archivo (reemplazados por breadcrumb + `.pagination`/`.page-btn`) — esas clases CSS no se tocaron porque `.store-back` la sigue usando `CartDrawer.tsx`.

**Verificación real (paginación numerada con >1 página)**: como ninguna categoría real de Eliathi Modas tiene más de 24 productos, se armó un escenario temporal con un script (`backend/t20-05-pagination-test.mjs`, queda en el repo sin trackear, mismo criterio que `t10b-test.mjs`): admin *staff* temporal creado en la organización real (evitando usar la contraseña real del owner), 23 productos temporales creados en la categoría "Jeans" existente (2 reales + 23 = 25 → `totalPages=2` a `CATEGORY_PAGE_SIZE=24`), se confirmó contra `/public/eliathi-modas/categories/jeans/products` que la página 1 trae 24 productos y la página 2 trae 1 sin solapamiento, y se borró todo al final (23 productos + admin temporal) — 11/11 checks en verde, org real sin residuos.

`tsc --noEmit` y `vite build` limpios. **Pendiente**: verificación visual del usuario en el navegador (`/store/eliathi-modas/c/jeans` u otra categoría) — banner, toolbar, grilla, y que el sort deshabilitado no genere confusión.
