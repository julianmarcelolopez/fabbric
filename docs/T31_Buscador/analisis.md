# Análisis — Buscador de productos (tienda pública)

Origen: `propuesta-buscador.md` y `mockups/buscador.html` (documento y mockup
ya existentes, escritos antes de `T29_Marcas` y `T30_HeaderTienda`). Este
análisis verifica esa propuesta contra el código real **después** de esas
dos tareas, y corrige lo que quedó desactualizado o impreciso.

## 1. ¿Choca con T30_HeaderTienda? No — viven en partes distintas del header

El ícono de lupa vive en `StoreLayout.tsx:312-316`, dentro de
`<div className="store-header-actions">` — un contenedor **hermano** de
`<nav className="store-nav">` (línea 303-310, lo que T30 reemplazó por los 4
links fijos). Son dos bloques distintos del mismo header, no se superponen:

```
<div className="store-header-inner">
  <Link className="store-logo-wrap">...</Link>
  <nav className="store-nav">...</nav>              ← T30 tocó esto
  <div className="store-header-actions">
    <button ...><SearchIcon /></button>              ← T31 toca esto
    <ShareButton />
    <AccountButton />
    <CartButton />
  </div>
</div>
```

El propio mockup (`buscador.html`, estado 02) ya planteaba que al hacer clic
en la lupa, el bloque de nav completo se **reemplaza** por el campo de
búsqueda (no coexisten). Ese patrón funciona igual o mejor con los 4 links
fijos de T30 que con la nav dinámica vieja (categorías reales, ancho
variable por tenant) — un bloque de ancho conocido es más simple de
esconder/reemplazar que uno de ancho variable. **T30 no es un obstáculo, es
si acaso una simplificación** para implementar esto.

## 2. Estado actual (confirmado contra el código)

- `StoreLayout.tsx:314` — el botón de lupa existe, con `disabled` y el
  comentario histórico de T20/02.
- `SearchIcon` ya está importado (`StoreLayout.tsx:9`, desde `./icons`) — no
  hace falta un ícono nuevo.
- No existe ningún endpoint público de búsqueda por texto (confirmado:
  `grep "app.get(" public/routes.ts` no tiene ningún `/search`).
- `CategoryPage.tsx` (después de T30) ya no es un componente de 2 modos —
  es un componente de **5 modos** (`category | collection | brand |
  novedades | ofertas`) con un `MODE_TEXT` centralizado (líneas 52-64) para
  breadcrumb/título/estado vacío, pensado justo para que sumar un modo sea
  agregar una entrada, no duplicar el layout.

## 3. Decisión tomada en esta conversación: reusar `CategoryPage.tsx`

La propuesta original planteaba un componente nuevo,
`SearchResultsPage.tsx`, para "Ver todos los resultados". **Se descarta esa
idea** — se agrega un sexto modo `"search"` a `CategoryPage.tsx` en su lugar,
por lo mismo que ya justificó T21/02 (category/collection) y T29/06 (brand):
evitar duplicar banner + toolbar + sidebar + grilla + paginación una tercera
vez.

**No es un cambio mecánico como los anteriores** — a diferencia de
category/collection/brand/novedades/ofertas, el modo `search` no tiene un
slug ni un título fijo: depende de `?q=texto` en la URL, no de un route
param. Esto toca varios puntos que asumían "slug o nada":

- `itemSlug` (línea 73) hoy resuelve `collectionSlug`/`brandSlug`/`categorySlug`
  — search necesita `searchParams.get("q")` en su lugar, leído de la URL
  igual que `page`/`talle`/etc. (línea 76 y siguientes), no de `useParams()`.
- El efecto que resetea filtros al cambiar de ítem (línea 112-120, dependencia
  `[mode, itemSlug]`) necesita sumar `q` a esa dependencia — una búsqueda
  nueva reinicia los filtros igual que cambiar de categoría.
- El fetch (línea 162-171) necesita un quinto branch: `` `/public/${slug}/search?q=${encodeURIComponent(q)}&${params}` ``.
- **`MODE_TEXT` no alcanza para `search`** — sus tres campos son estáticos
  (`indexLabel`/`notFound`/`empty`), pero el título y el mensaje vacío de
  esta pantalla incluyen el término buscado (`Resultados para "campera"` /
  `No encontramos productos que coincidan con "campera".`). Se resuelven
  como casos especiales puntuales en `item` (línea 198-207) y en el mensaje
  de vacío (línea 372-375), no agregando una entrada más a la tabla — la
  tabla sigue sirviendo tal cual para los otros 5 modos.
- El breadcrumb de `search` queda en 2 niveles, igual que Novedades/Ofertas
  (`MODE_TEXT["search"].indexLabel = null` — no hay un índice del que cuelgue).
- **Sin sidebar de filtros combinados** (decisión ya tomada en la propuesta
  original, sección "Fuera de alcance") — pero el componente los sigue
  soportando estructuralmente; simplemente el backend de `/search` no va a
  aceptar `talle`/`color`/`marca`/precio en esta v1, así que
  `availableFilters` vuelve `{talles:[], colores:[]}` (marcas ausente, mismo
  criterio que el endpoint de marca puntual) y esos grupos del sidebar no se
  renderizan solos, sin tocar la lógica del componente.

## 4. Corrección de un detalle desactualizado de la propuesta original

`propuesta-buscador.md` dice reusar el token `--coral`. **No existe ese
nombre** — la variable real en `catalog.css:16` es `--tenant-primary`
(`var(--accent, #F07058)`). El resto de los tokens que menciona (`--navy`,
`--off`, `--gray`, `--muted`) sí son correctos tal cual.

## 5. Precedentes ya existentes para reusar (no inventar de cero)

- **Debounce de búsqueda**: `frontend/src/features/admin/pages/CustomersPage.tsx:13-16`
  ya implementa exactamente el patrón que pide la propuesta (buscar por
  nombre/email con debounce). El buscador público puede calcar esa misma
  estructura de `setTimeout`.
- **Panel flotante posicionado**: `.account-dropdown` (`catalog.css:187-190`)
  ya define el patrón visual de un panel que cuelga del header (`position:
  absolute; top: calc(100% + 8px); box-shadow; z-index: 110`) — el dropdown
  de resultados de búsqueda puede calcar esa misma receta en vez de inventar
  un nuevo lenguaje de sombras/posicionamiento.
- **Ícono**: `SearchIcon` ya existe y ya está importado — solo hay que
  sacarle el `disabled` y darle comportamiento real.

## 6. Alcance (heredado de la propuesta original, sin cambios)

Ver `propuesta-buscador.md` secciones "Incluido"/"Fuera de alcance" — se
mantienen tal cual: búsqueda por nombre (parcial, case-insensitive),
resultados en vivo con dropdown + link a resultados completos, mobile como
overlay de pantalla completa, sin SKU/fuzzy search/historial/filtros
combinados en esta v1.
