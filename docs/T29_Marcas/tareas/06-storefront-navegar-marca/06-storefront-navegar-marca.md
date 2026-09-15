# Tarea 6 — Storefront: navegar y filtrar por marca

**Estado:** ✅ Hecha — verificada con Playwright real (12/12 PASS).

**Depende de:** Tarea 5 (necesita los endpoints públicos ya devolviendo marca por slug).

## Objetivo (según `plan.md`, T29/06)

El comprador puede entrar a la pestaña "Marcas" de "Explorá la tienda", ver
todas las marcas activas con productos visibles (listado automático, sin
curación por `home_sections` — decisión 4 / `../../analisis.md` sección 5),
y navegar a la página de una marca individual.

## Cierre del pase a slug que la Tarea 5 dejó pendiente

Esta tarea completó el cambio de contrato que la Tarea 5 dejó a propósito sin
tocar (para no romper el storefront antes de que este supiera consumirlo):

- `public/routes.ts` — `brandNameCondition()` → `brandSlugCondition()`, ahora matchea `brands.slug` (`?marca=taverniti`, no `?marca=Taverniti`).
- `brand: brands.name` (string) → `brand: {name, slug} | null` en los 4 endpoints existentes (`/home` ×2 subconsultas, `/categories/:slug/products`, `/collections/:slug/products`, `/products/:id`) y también en `/brands/:brandSlug/products` (nacía con slug en el propio recurso, pero el campo `brand` de cada producto todavía era texto — quedó igual de consistente que el resto).
- `availableFilters.marcas`: `string[]` → `{name, slug}[]` en categoría/colección. **Ausente** (no `[]` vacío) en la página de una marca puntual — no tiene sentido filtrar por marca dentro de esa misma marca.
- Nuevo endpoint `GET /public/:slug/brands` — todas las marcas activas de la org con ≥1 producto visible, con conteo (`productCount`). No estaba en el inventario original de la Tarea 5 (que solo hizo el endpoint de una marca puntual) — hacía falta para el tab, se agregó acá.

## Hallazgo real durante la implementación: riesgo de crash en React

`HomeSectionsRenderer.tsx` (`HsrSection.products[].brand?: string | null`) es un
componente **compartido** entre el preview del admin (`MyStorePage.tsx`, que
sí sigue mandando un string) y la tienda pública (`CatalogHomePage.tsx`, que
ahora recibe `{name, slug} | null` desde el backend). Si `CatalogHomePage.tsx`
hubiera pasado la respuesta de `/public/:slug/home` sin normalizar,
`ProductCard.tsx` habría intentado renderizar el objeto directo
(`{brand && <p>{brand}</p>}`) — React tira **"Objects are not valid as a
React child"**, rompiendo toda la portada. Se resolvió normalizando en el
borde (`CatalogHomePage.tsx`, función `normalizeHomeSections`, exportada y
reusada también por `CategoriesIndexPage.tsx`): `brand: p.brand?.name ?? null`
antes de guardar el estado. **Decisión de diseño**: los componentes
presentacionales compartidos (`ProductCard`, `ProductDetailView`,
`HomeSectionsRenderer`) NO se tocaron — siguen esperando `string | null`;
la conversión del nuevo contrato `{name, slug}` pasa solo en las páginas que
hacen el fetch (`CatalogHomePage.tsx`, `CategoryPage.tsx`,
`StoreProductPage.tsx`), para no tener que auditar todos los consumidores de
esos componentes compartidos con el admin.

## Pasos

### 1. Tab "Marcas" en el índice

- [x] `CategoriesIndexPage.tsx` — tercer tab `"brands"`, con soporte de `?tab=marcas` en la URL (vía `useSearchParams`, estado inicial) para que el breadcrumb "Marcas" de la página de una marca pueda linkear ahí de vuelta.
- [x] Fuente de datos propia: `GET /public/:slug/brands` (nuevo, ver arriba) — no pasa por `home_sections`.
- [x] Tarjetas con el mismo estilo que `col-card` — logo real si la marca tiene `imageUrl`, tinte navy+coral de placeholder si no. Mismo componente/CSS que Colecciones, sin agregar nada nuevo al `catalog.css`.

### 2. Página individual de marca

- [x] `router.tsx` — `{ path: "m/:brandSlug", element: <CategoryPage mode="brand" /> }`.
- [x] `CategoryPage.tsx` — tercer modo `"brand"` (mismo patrón que T21/02 para category/collection): elige el endpoint (`GET /public/:slug/brands/:brandSlug/products`), la resolución de `item` (`"brand" in data ? data.brand : ...`), y el breadcrumb ("Marcas", con link a `?tab=marcas`).

### 3. Filtro de marca dentro de categoría/colección

- [x] El sidebar de marca sigue igual visualmente — el valor de cada chip (`key`/`onClick`) pasa a ser `m.slug`, la etiqueta visible sigue siendo `m.name`.

## Cómo se verificó

**Playwright real** (`frontend/t29-06-storefront-marcas.mjs`, viewport 1280×900,
org descartable **sin usuario admin** — son todas rutas públicas, no toca
datos de Eliathi, limpia todo al final). Cubre explícitamente la regresión de
React descrita arriba, capturando errores de consola de la página en cada
paso:

1. Home: el producto con marca se ve como texto plano (`.pcard-brand`), no `[object Object]`.
2. `?tab=marcas` activa el tab correcto; la marca aparece con su conteo real de productos.
3. Click en la marca → navega a `/m/:brandSlug`; breadcrumb dice "Marcas"; el producto aparece.
4. Dentro de la categoría, el chip de marca filtra y la URL queda con el **slug** (`?marca=pw-marca-store-...`), no el nombre.
5. Ficha de producto pública: la marca se ve como texto plano (`.pdv-brand`).
6. **Cero errores de consola** en las 5 pantallas visitadas.
7. Cleanup: 0 filas huérfanas.

**12/12 PASS en la primera corrida.** `npx tsc --noEmit` limpio en `backend/`, `frontend/` y `pwa/` (0 errores en los tres).

## Definition of Done

- [x] Tab "Marcas" en "Explorá la tienda", con todas las marcas activas con stock visible.
- [x] `/store/:slug/m/:brandSlug` funciona igual que categoría/colección (banner, toolbar, sidebar, grilla, paginación).
- [x] El filtro de marca dentro de categoría/colección sigue funcionando, ahora por slug.
- [x] Sin cambios en `StoreLayout.tsx` (header) — confirmado, no hizo falta.

## Dependencias

- **La bloquean:** Tarea 5.
- **Bloquea:** nada de T29 — es la última tarea funcional (Tarea 7 es verificación).
