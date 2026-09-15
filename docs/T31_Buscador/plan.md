# Plan — Buscador de productos (tienda pública)

Basado en `analisis.md` (decisiones de las secciones 1-5) y en
`propuesta-buscador.md` (alcance de la sección 6, sin cambios). Orden de
dependencia: primero el backend (sin él no hay nada que mostrar), después la
página de resultados completos (reusa `CategoryPage.tsx`, la parte más
simple porque no tiene estado de "escribiendo"), después el componente vivo
del header (la parte más compleja: expandirse, debounce, dropdown), después
el overlay mobile (variante del anterior), por último la verificación de
punta a punta.

## Desglose en tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-backend-search](tareas/01-backend-search/01-backend-search.md) — endpoint `GET /public/:slug/search` | nada | ✅ Hecha |
| 2 | [02-pagina-resultados](tareas/02-pagina-resultados/02-pagina-resultados.md) — modo `"search"` en `CategoryPage.tsx` + ruta `/buscar` | 1 | ✅ Hecha |
| 3 | [03-searchbar-desktop](tareas/03-searchbar-desktop/03-searchbar-desktop.md) — componente vivo en el header (expandir + dropdown + debounce) | 1 | ✅ Hecha |
| 4 | [04-overlay-mobile](tareas/04-overlay-mobile/04-overlay-mobile.md) — buscador de pantalla completa en mobile | 3 | ✅ Hecha |
| 5 | [05-verificacion-final](tareas/05-verificacion-final/05-verificacion-final.md) — checklist en vivo | 1-4 | ✅ Hecha |

**T31_Buscador completo — las 5 tareas hechas y verificadas.**

## T31/01 — Backend: endpoint de búsqueda

**Objetivo**: endpoint público nuevo, mismo contrato de seguridad y
paginado que el resto de `public/routes.ts`, sin filtros combinados (fuera
de alcance de esta v1).

**Alcance** (`backend/src/modules/public/routes.ts`)
- `GET /public/:slug/search` — query param `q` obligatorio (400 si falta o
  viene vacío, como ya pide la propuesta).
- Búsqueda case-insensitive por nombre: `ilike(products.name, `%${q}%`)`
  (Drizzle expone `ilike` para Postgres — no hace falta `sql` crudo).
- `scopeFilter`: mismo criterio que Novedades/Ofertas — `orgId`,
  `visibleInCatalog`, `status !== paused`, sin `talle`/`color`/`marca`/precio
  (fuera de alcance) — así que **no** reusa `extraFilterConditions()` (esa
  función incluye esos filtros); solo reusa `resolveSort()`/`productListQuery`
  parcialmente, o se define su propio querystring reducido (`q` + `page` +
  `sort`, sin `talle`/`color`/`marca`/`precioMin`/`precioMax`) para que el
  frontend no muestre controles de filtro que no van a hacer nada.
- Devuelve `totalCount` y el mismo shape de producto que el resto
  (`id, name, price, compareAtPrice, brand: {name,slug}|null, imageUrl`).
- Paginado con `CATEGORY_PAGE_SIZE` (24).
- `availableFilters` puede omitirse del todo (a diferencia de Novedades/
  Ofertas, que sí lo completan) — si el endpoint no acepta esos filtros,
  no hace falta calcularlos.

**Criterio de aceptación**: `GET /public/:slug/search?q=remera` devuelve
productos cuyo nombre contiene "remera" (case-insensitive), paginados. Sin
`q` o con `q` vacío, devuelve 400.

## T31/02 — Frontend: página de resultados completos

**Objetivo**: `/store/:slug/buscar?q=texto` funciona igual que categoría/
colección/marca/novedades/ofertas — reusando `CategoryPage.tsx`, no un
componente nuevo (decisión de `analisis.md` sección 3).

**Alcance**
- `types.ts` — `PublicSearchResults` (mismo shape que `PublicProductListing`,
  sin `availableFilters.marcas` — ver T31/01).
- `CategoryPage.tsx`:
  - `Mode` suma `"search"`.
  - `q` se lee de `searchParams.get("q")` (no de `useParams()`, a diferencia
    de `itemSlug`) — sumarlo a las dependencias del efecto de reset de
    filtros (línea ~120) y del efecto de fetch (línea ~181).
  - Fetch: nuevo branch `` `/public/${slug}/search?q=${encodeURIComponent(q)}&${params}` ``.
  - `item` (línea ~198): caso especial `mode === "search" ? { name: `Resultados para "${q}"` } : ...` — **no** entra en `MODE_TEXT` (esa tabla es solo para texto estático).
  - Mensaje de "sin resultados" (línea ~372): caso especial con el término
    incluido — `No encontramos productos que coincidan con "${q}".` — tampoco
    entra en `MODE_TEXT` por el mismo motivo.
  - `MODE_TEXT["search"]` sí lleva las partes que SÍ son estáticas:
    `indexLabel: null` (2 niveles de breadcrumb, igual que Novedades/Ofertas),
    `notFound: "resultados para tu búsqueda"`.
  - El grupo de filtro "Marca" del sidebar no se muestra solo (data-driven,
    `availableFilters.marcas` ausente) — sin tocar esa lógica.
- `router.tsx` — `{ path: "buscar", element: <CategoryPage mode="search" /> }`.

**Criterio de aceptación**: `/store/:slug/buscar?q=remera` renderiza banner
(`Resultados para "remera"`), toolbar, grilla y paginación reales. Con 0
resultados, muestra el mensaje específico con el término, no un mensaje
genérico ni un error.

## T31/03 — Frontend: buscador vivo en el header (desktop)

**Objetivo**: el ícono de lupa deja de ser decorativo — clic lo expande a un
campo de texto con resultados en vivo, calcando el patrón ya mostrado en
`buscador.html`.

**Alcance**
- Nuevo componente `frontend/src/features/store/components/SearchBar.tsx`
  — estado local (expandido/colapsado, texto, resultados, cargando), con
  debounce ~300ms antes de pegarle al endpoint (mismo patrón que
  `CustomersPage.tsx:13-16`, ver `analisis.md` sección 5).
- `StoreLayout.tsx:312-316` — el botón `disabled` se reemplaza por
  `<SearchBar slug={slug} />`. Al expandirse, oculta `<nav className="store-nav">`
  (sibling, línea 303) en vez de intentar que convivan — mismo patrón que
  `buscador.html` estado 02.
- Dropdown de resultados (hasta 5, con miniatura+nombre+precio, linkeando a
  la ficha de producto) — reusar el lenguaje visual de `.account-dropdown`
  (`catalog.css:187-190`: `position: absolute; box-shadow; z-index`) en vez
  de inventar un nuevo patrón de panel flotante.
- Estado "sin resultados": mensaje directo + 2-3 categorías sugeridas (ver
  `propuesta-buscador.md` sección "Diseño", punto 4).
- Link "Ver todos los resultados para «…»" al fondo del dropdown → navega a
  `/store/:slug/buscar?q=...` (la página de la Tarea 2).
- Clases CSS nuevas en `catalog.css` — reusar tokens existentes
  (`--navy`, `--tenant-primary` — **no** `--coral`, ver `analisis.md`
  sección 4 — `--off`, `--gray`, `--muted`), sin agregar colores nuevos.

**Criterio de aceptación**: clic en la lupa expande el campo con foco
automático; escribir 2+ caracteres muestra resultados reales en menos de un
segundo (con debounce real, no un request por tecla); un término sin
coincidencias muestra el estado vacío con sugerencias, nunca un panel en
blanco; cada resultado navega directo a la ficha del producto.

## T31/04 — Frontend: overlay mobile

**Objetivo**: en mobile (breakpoint 768px, mismo que el resto de la tienda
desde T20), la lupa abre un buscador de pantalla completa en vez de expandir
in-place (el header no tiene espacio).

**Alcance**
- Componente separado (ej. `SearchOverlayMobile.tsx`) montado
  condicionalmente por breakpoint, o el mismo `SearchBar.tsx` con una
  variante de layout — a decidir al implementar según qué tan distinto sea
  el JSX de los dos casos (la propuesta sugiere separarlos).
- Input arriba con foco automático, resultados como lista vertical, botón de
  cerrar — mismos datos/debounce que la Tarea 3, solo cambia la presentación.

**Criterio de aceptación**: en una ventana ≤768px, tocar la lupa abre un
overlay de pantalla completa (no un dropdown angosto ilegible); el resto del
comportamiento (debounce, resultados, sin resultados, ver todos) es
idéntico al desktop.

## T31/05 — Verificación final

**Checklist** (heredado de los "Criterios de aceptación" de
`propuesta-buscador.md`, sin cambios)
- [ ] Escribir un nombre de producto real muestra resultados coincidentes en menos de un segundo, con debounce (no un request por tecla).
- [ ] Un término sin coincidencias muestra el estado vacío con sugerencias, nunca un panel en blanco ni un error.
- [ ] "Ver todos los resultados" lleva a `/buscar?q=...` con el total real de coincidencias, paginado.
- [ ] Cada resultado del dropdown navega directo a la ficha de producto.
- [ ] Funciona en mobile como overlay de pantalla completa, sin romper el layout del header.
- [ ] Verificado con un término que devuelve 0, 1 y más de 24 resultados.
- [ ] `npx tsc --noEmit` limpio en `backend/` y `frontend/`.
