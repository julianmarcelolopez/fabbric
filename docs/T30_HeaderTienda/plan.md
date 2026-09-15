# Plan — Header fijo (Inicio / Explorar / Novedades / Ofertas)

Basado en `analisis.md` (decisiones 1-6, sección 5, y sección 7 — leer antes
de codear: ajustes por lo que cambió con T29_Marcas). Novedades y Ofertas
quedan funcionalmente idénticas a categoría/colección salvo el filtro de
scope inicial — se implementan como dos modos más del mismo patrón, no como
algo nuevo desde cero.

## Desglose en tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-backend-novedades-ofertas](tareas/01-backend-novedades-ofertas/01-backend-novedades-ofertas.md) — endpoints públicos nuevos | nada | ✅ Hecha |
| 2 | [02-frontend-paginas-novedades-ofertas](tareas/02-frontend-paginas-novedades-ofertas/02-frontend-paginas-novedades-ofertas.md) — rutas + modos en `CategoryPage.tsx` | 1 | ✅ Hecha |
| 3 | [03-header-nav-fija](tareas/03-header-nav-fija/03-header-nav-fija.md) — reemplazar la nav dinámica del header | 2 | ✅ Hecha |
| 4 | [04-verificacion-final](tareas/04-verificacion-final/04-verificacion-final.md) — checklist en vivo | 1-3 | ✅ Hecha |

**T30_HeaderTienda completo — las 4 tareas hechas y verificadas.**

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
  **`isNotNull` hay que volver a importarlo de `drizzle-orm`** — se sacó en
  T29/05 al quedar sin uso en ese momento (`analisis.md` sección 7).
- Ambos reusan `extraFilterConditions()`, `resolveSort()`, `productListQuery`
  y `availableFilters` (talles/colores/marcas) tal cual — mismo querystring
  que categoría/colección (`?talle=&color=&marca=&precioMin=&precioMax=&sort=&page=`).
  El filtro de marca ya funciona por slug (heredado de T29/06) sin nada
  adicional que hacer acá.
- Sin paso de "buscar por slug" (no hay una entidad Novedades/Ofertas en la
  DB) — directo al `scopeFilter`.
- Paginado igual (`CATEGORY_PAGE_SIZE = 24`, sin recorte curado, decisión 5).
- Respuesta **sin clave de grupo** (a diferencia de `category`/`collection`/
  `brand`) — solo `{ products, page, pageSize, totalCount, totalPages,
  availableFilters }`. No hay una entidad "Novedades" que devolver, y el
  frontend (T30/02) va a resolver el título por `mode`, no por esa clave.

**Criterio de aceptación**: `GET /public/:slug/novedades/products` devuelve
productos ordenados por más nuevos primero, paginados, con los mismos filtros
que categoría. `GET /public/:slug/ofertas/products` devuelve solo productos
con precio tachado.

## T30/02 — Frontend: páginas Novedades y Ofertas

**Objetivo**: dos rutas nuevas, reusando `CategoryPage.tsx` en vez de crear
un componente aparte.

**Alcance**
- `CategoryPage.tsx` — `mode` ya es `"category" | "collection" | "brand"`
  (T29/06): se extiende a sumar `"novedades" | "ofertas"`, no se crea desde
  dos valores como asumía la versión vieja de este plan.
- **Cambio real de enfoque, necesario porque no hay entidad "Novedades" en
  la DB**: la resolución de `item` hoy es por forma de `data`
  (`"collection" in data ? ... : "brand" in data ? ... : data.category`,
  `CategoryPage.tsx:175`) — no extiende bien a un modo sin clave de grupo.
  Pasa a resolverse por `mode` directamente:
  ```ts
  const item =
    mode === "collection" ? (data as PublicCollectionProducts).collection :
    mode === "brand" ? (data as PublicBrandProducts).brand :
    mode === "novedades" ? { name: "Novedades" } :
    mode === "ofertas" ? { name: "Ofertas" } :
    (data as PublicCategoryProducts).category;
  ```
  (o el equivalente con un discriminated union prolijo si al implementar se
  prefiere evitar los `as` — queda a criterio de quien lo escriba, el punto
  es que la resolución sea por `mode`, no por presencia de clave).
- **El breadcrumb tiene un nivel menos**: categoría/colección/marca son
  `Inicio › [Categorías|Colecciones|Marcas] › {item.name}` (3 niveles, con
  link al índice `/categorias`). Novedades/Ofertas no tienen un "índice" del
  que cuelguen — son ítems de nav de primer nivel — así que el breadcrumb
  queda en 2 niveles: `Inicio › Novedades` / `Inicio › Ofertas`, sin el nivel
  del medio.
- `router.tsx:65-78` — nuevas rutas:
  `{ path: "novedades", element: <CategoryPage mode="novedades" /> }`
  `{ path: "ofertas", element: <CategoryPage mode="ofertas" /> }`
- Tipos nuevos en `store/types.ts`: `PublicNovedadesProducts`/
  `PublicOfertasProducts` (o un solo tipo genérico reusado por ambos, ya que
  la respuesta es idéntica salvo el significado) — mismo shape que
  `PublicCategoryProducts` pero sin la clave `category`.
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
