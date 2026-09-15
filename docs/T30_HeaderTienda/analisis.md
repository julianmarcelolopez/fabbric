# Análisis — Header fijo de la tienda (Inicio / Explorar / Novedades / Ofertas)

Origen: durante el análisis de Marcas (`docs/T29_Marcas`) se armó un mockup
visual (`https://claude.ai/artifact/ASKyNVyE2xhgKemn4vvxY8`) con un header de
adorno — `Inicio / Explorar / Novedades / Ofertas` — que no reflejaba el
código real. Al verlo, la decisión fue adoptar ese header de verdad. Es un
cambio de alcance distinto a Marcas (toca la tienda entera, no un catálogo
puntual), por eso queda en su propia carpeta.

## 1. Estado actual del header

`frontend/src/features/store/StoreLayout.tsx:296-305`:

```
<nav className="store-nav">
  {navCategories?.map((c) => <NavLink to={`/store/${slug}/c/${c.refSlug}`}>{c.refName}</NavLink>)}
  <NavLink to={`/store/${slug}/categorias`}>Ver todo</NavLink>
</nav>
```

- `navCategories` (línea 184) son categorías reales del tenant — **dinámico**,
  no una lista fija. Un tenant con 6 categorías activas hoy ve 6 links + "Ver
  todo" en el header.
- El **footer** duplica exactamente la misma lista (`StoreLayout.tsx:364-374`,
  columna "Tienda") — mismo `navCategories`, mismos links a `/c/:categorySlug`.
- No existen hoy los links "Inicio", "Explorar", "Novedades" ni "Ofertas" en
  ningún lado del código (`grep` de esas 4 palabras en `frontend/src` solo
  encuentra un comentario en `CategoriesIndexPage.tsx:13` que dice que la
  pestaña "Ofertas" del mockup original de T20 **se descartó a propósito en
  V1** por falta de una fuente de datos clara).

## 2. Rutas hoy (`frontend/src/router.tsx:65-78`)

| Ruta | Página | Rol |
|---|---|---|
| `/store/:slug` (index) | `CatalogHomePage` | Home — candidato natural para "Inicio" |
| `/store/:slug/categorias` | `CategoriesIndexPage` | Tabs Categorías/Colecciones (+Marcas, T29) — candidato natural para "Explorar" |
| `/store/:slug/c/:categorySlug` | `CategoryPage` | Categoría individual |
| `/store/:slug/col/:collectionSlug` | `CategoryPage mode="collection"` | Colección individual |
| — | — | **No existe** ruta para "Novedades" ni "Ofertas" |

"Inicio" y "Explorar" ya tienen página — es solo cablear el nav. "Novedades" y
"Ofertas" necesitan página + endpoint nuevos.

## 3. Qué backend ya sirve, y qué falta

`backend/src/modules/public/routes.ts:27-79` — helpers compartidos por
categoría/colección:
- `resolveSort()` línea 74-79 **ya tiene** `sort === "nuevos" → desc(products.createdAt)`.
  Novedades = exactamente ese orden, sin filtro adicional (o acotado a los
  últimos N).
- `extraFilterConditions()` línea 62-72 **no tiene** ningún filtro de "en
  oferta". Se agrega: `isNotNull(products.compareAtPrice)` — alcanza, porque
  el propio schema garantiza por convención que `compareAtPrice` solo se
  guarda cuando es mayor que `price` (`schema.ts:121`, "solo si es mayor que
  price"). Ofertas = productos con ese campo no nulo.
- **No existe ningún endpoint que liste productos de toda la organización sin
  acotar a una categoría o colección** (`grep "app.get(" public/routes.ts` —
  solo `/categories/:slug/products` y `/collections/:slug/products`, además de
  `/home`, `/config`, `/products/:id`, `/shipping-zones`). Novedades y Ofertas
  necesitan ese tipo de endpoint nuevo: mismo patrón (paginado, `productFilter`,
  `availableFilters`), pero con scope = toda la org en vez de un `categoryId`/
  `collectionId`.

## 4. El cambio real de UX que esto implica

Hoy el header (y el footer) muestran **categorías individuales** como links
directos — un comprador entra a "Remeras" en un clic desde cualquier página.
Con el header fijo, esos links desaparecen del header: para llegar a una
categoría hay que ir a "Explorar" y elegir la pestaña/tarjeta. Es una
navegación con un paso más para el caso más común (ver una categoría
puntual) — vale decirlo explícito porque no es gratis, es un trade-off de UX,
no solo un cambio visual.

Pendiente confirmar: **¿el footer también pasa a los 4 links fijos**, o
mantiene la lista de categorías reales (columna "Tienda") como está hoy?
Cambiar el header pero no el footer es válido — son componentes distintos con
roles distintos (navegación rápida vs. mapa del sitio) — pero hay que decirlo
a propósito, no dejarlo así por omisión.

## 5. Decisiones ya tomadas

1. **"Ofertas"** = productos con `compareAtPrice` no nulo (precio tachado).
2. **"Novedades"** = productos ordenados por `createdAt` descendente (los más
   recién creados).
3. Se documenta en carpeta propia (`T30_HeaderTienda`), separada de
   `T29_Marcas` — este cambio no es específico de marcas.
4. **El footer no cambia** — sigue mostrando la lista real de categorías
   (columna "Tienda", `StoreLayout.tsx:364-374`). Header = navegación rápida
   fija; footer = mapa del sitio con categorías reales. Roles distintos a
   propósito.
5. **Novedades y Ofertas muestran todo lo que matchea, paginado** — mismo
   patrón que categoría/colección (24 por página, sin recorte curado por
   fecha ni cantidad).
6. **Mismo sidebar de filtros completo** (talle/color/marca/precio) que
   categoría/colección — sin una UI de listado "simplificada" aparte.

Con 4-6, Novedades y Ofertas quedan funcionalmente idénticas a
categoría/colección salvo el `scopeFilter` inicial (sección 3) — se pueden
implementar como dos modos más del mismo componente/endpoint, no como algo
nuevo.

## 6. Preguntas — todas resueltas (sección 5)

Sin puntos pendientes. El home (`CatalogHomePage.tsx`) no se toca — solo se
cablea el link "Inicio" del nav hacia la ruta índice que ya existe.

## 7. Actualización — lo que cambió con T29_Marcas (releer antes de codear)

Este análisis se escribió antes de implementar `T29_Marcas`, que terminó
tocando los mismos archivos que toca este plan (`CategoryPage.tsx`,
`router.tsx`, `public/routes.ts`). El código real hoy es distinto a lo que
`plan.md` asumía en algunos puntos — releer esto antes de tocar código:

- `CategoryPage.tsx` ya tiene un tercer modo real: `mode?: "category" |
  "collection" | "brand"` (no dos como cuando se escribió `plan.md` T30/02).
  Sumar `"novedades" | "ofertas"` es extender esa misma unión, no crear una
  nueva de dos valores.
- La resolución del `item` para el banner/breadcrumb hoy es
  `"collection" in data ? data.collection : "brand" in data ? data.brand :
  data.category` (`CategoryPage.tsx:175`) — basada en qué clave tiene la
  respuesta. Para Novedades/Ofertas **no hay ninguna clave de grupo** en la
  respuesta (no hay una entidad "Novedades" en la DB, a diferencia de
  categoría/colección/marca) — este patrón por presencia de clave no
  extiende bien. Ver decisión en `plan.md` T30/02 actualizado: pasar a
  resolver por `mode` directamente en vez de por forma de `data`.
- `extraFilterConditions()`/`resolveSort()` siguen en el mismo lugar
  (`public/routes.ts`), sin cambios de firma — se reusan tal cual, como ya
  decía el plan. El filtro de marca (`brandSlugCondition`, ex
  `brandNameCondition`) ya matchea por **slug** (T29/06) — Novedades/Ofertas
  lo heredan gratis, sin trabajo extra.
- `isNotNull` se **sacó** del import de `drizzle-orm` en `public/routes.ts`
  durante T29/05 (quedó sin uso en ese momento) — T30/01 lo necesita de
  vuelta para el filtro de Ofertas (`isNotNull(products.compareAtPrice)`).
- `availableFilters.marcas` ya es `{name, slug}[]` (no `string[]`) desde
  T29/06 — Novedades/Ofertas heredan ese tipo tal cual, sin decisión nueva.
