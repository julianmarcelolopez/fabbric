# Plan — Header fijo (Inicio / Explorar / Novedades / Ofertas)

Basado en `analisis.md` (decisiones 1-6, sección 5). Novedades y Ofertas
quedan funcionalmente idénticas a categoría/colección salvo el filtro de
scope inicial — se implementan como dos modos más del mismo patrón, no como
algo nuevo desde cero.

## T30/01 — Backend: endpoints de Novedades y Ofertas

**Objetivo**: dos endpoints públicos nuevos, mismo contrato que
`/collections/:collectionSlug/products` pero sin scope de taxonomía.

**Alcance** (`backend/src/modules/public/routes.ts`)
- `GET /public/:slug/novedades/products` — `scopeFilter` = productos de la
  org, visibles, no pausados (sin filtro de categoría/colección). Orden fijo
  `desc(products.createdAt)` (reusa `resolveSort`, pero acá no es opcional —
  es el criterio propio de la página, aunque el usuario puede recombinar con
  `sort=precio_asc/desc` desde el toolbar igual que en categoría).
- `GET /public/:slug/ofertas/products` — mismo `scopeFilter` + agrega
  `isNotNull(products.compareAtPrice)` (sección 3 del análisis: alcanza solo
  con eso, el schema garantiza `compareAtPrice > price` cuando está seteado).
- Ambos reusan `extraFilterConditions()`, `resolveSort()`, `productListQuery`
  y `availableFilters` (talles/colores/marcas) tal cual — mismo querystring
  que categoría/colección (`?talle=&color=&marca=&precioMin=&precioMax=&sort=&page=`).
- Sin paso de "buscar por slug" (no hay una entidad Novedades/Ofertas en la
  DB) — directo al `scopeFilter`.
- Paginado igual (`CATEGORY_PAGE_SIZE = 24`, sin recorte curado, decisión 5).

**Criterio de aceptación**: `GET /public/:slug/novedades/products` devuelve
productos ordenados por más nuevos primero, paginados, con los mismos filtros
que categoría. `GET /public/:slug/ofertas/products` devuelve solo productos
con precio tachado.

## T30/02 — Frontend: páginas Novedades y Ofertas

**Objetivo**: dos rutas nuevas, reusando `CategoryPage.tsx` en vez de crear
un componente aparte.

**Alcance**
- `CategoryPage.tsx` — extender `mode` a `"category" | "collection" |
  "novedades" | "ofertas"` (y `"brand"` si T29 ya está implementado en ese
  momento). Para `novedades`/`ofertas` no hay `item` que buscar por slug —
  el título/breadcrumb del banner es fijo (`"Novedades"` / `"Ofertas"`), y el
  `totalCount` viene directo de la respuesta del endpoint de T30/01.
- `router.tsx:65-78` — nuevas rutas:
  `{ path: "novedades", element: <CategoryPage mode="novedades" /> }`
  `{ path: "ofertas", element: <CategoryPage mode="ofertas" /> }`
- Mismo sidebar de filtros completo (decisión 6) — sin cambios de UI, solo de
  endpoint/mode.

**Criterio de aceptación**: `/store/:slug/novedades` y `/store/:slug/ofertas`
renderizan igual que una categoría (banner, toolbar, sidebar, grilla,
paginación), con los datos correctos de cada endpoint.

## T30/03 — Header: nav fija

**Objetivo**: reemplazar la nav dinámica del header por los 4 links fijos.

**Alcance**
- `StoreLayout.tsx:296-305` — reemplazar:
  ```
  {navCategories?.map(...)}
  <NavLink to=".../categorias">Ver todo</NavLink>
  ```
  por:
  ```
  <NavLink to={`/store/${slug}`} end>Inicio</NavLink>
  <NavLink to={`/store/${slug}/categorias`}>Explorar</NavLink>
  <NavLink to={`/store/${slug}/novedades`}>Novedades</NavLink>
  <NavLink to={`/store/${slug}/ofertas`}>Ofertas</NavLink>
  ```
- El `useState`/`useEffect` que carga `navCategories` (línea 184 y el fetch
  asociado) — revisar si sigue haciendo falta: **sigue usándose en el footer**
  (decisión 4, sin cambios ahí), así que no se borra, solo deja de leerse en
  el header.
- Sin cambios en el footer (`StoreLayout.tsx:364-374`) — decisión 4.

**Criterio de aceptación**: el header muestra siempre los mismos 4 links,
sin importar cuántas categorías tenga el tenant. El link activo se resalta
igual que antes (`.store-nav a.active`, ya existe en `catalog.css`). El
footer sigue mostrando las categorías reales, sin cambios visuales.

## T30/04 — Verificación final

**Checklist**
- [ ] Header muestra Inicio/Explorar/Novedades/Ofertas en las 4 páginas
      principales, con el activo resaltado en cada una.
- [ ] "Novedades" muestra los productos más recientes primero, paginado,
      filtros funcionando.
- [ ] "Ofertas" muestra solo productos con precio tachado.
- [ ] Footer sigue mostrando la lista real de categorías, sin cambios.
- [ ] Un tenant con 0 productos en oferta ve la página de Ofertas con el
      estado vacío correcto (no un error).
