# Análisis — Marcas como catálogo propio

Hoy "marca" es texto libre tipeado a mano en cada producto (admin y alta por QR).
El objetivo es que sea un catálogo propio (como Categorías/Colecciones), con alta
en el admin, selección desde combo en los dos puntos de carga, y una forma de
navegar la tienda por marca. Este documento relev a **todo** lo que toca hoy el
campo `brand` — admin, PWA y tienda pública — contra el código real, no contra
supuestos, para que `plan.md` pueda partir de un inventario completo.

## 1. Estado actual — `brand` es texto libre, sin tabla propia

- `backend/src/db/schema.ts:123-124` — tabla `products`: `brand: text("brand")`,
  nullable, sin FK, sin enum. Comentario en el schema: *"Marca de reventa o
  propia, texto libre sugerido (T12) — público"*.
- `packages/shared/src/schemas/product.ts:9,22,37,51,69` — Zod: `brandText =
  z.string().min(1).max(60)`, usado en `productSchema`, `createProductSchema`,
  `updateProductSchema` y `altaRapidaSchema`. Ninguna validación contra un
  catálogo — solo longitud.
- No existe ninguna tabla `brands`, ni relación `product_brands`. `categories`
  y `collections` sí son tablas propias con `id/name/slug/imageUrl/active`
  (`schema.ts:62-105`), únicas por `(orgId, slug)`.

## 2. Puntos de entrada de "marca" hoy

| Dónde | Archivo | Qué es hoy |
|---|---|---|
| Alta/edición en el admin web | `frontend/src/features/admin/pages/ProductEditPage.tsx:247-260` | `<input>` de texto libre + `<datalist>` de sugerencias (`maxLength={60}`) |
| Sugerencias del datalist | `frontend/src/features/admin/types.ts:89` | Array hardcodeado: `SUGGESTED_BRANDS = ["Taverniti","Bross","Adidas","Puma","Eliathi Modas"]` — no viene de ningún catálogo real |
| Alta por escaneo QR (PWA) | `pwa/src/screens/AltaScreen.tsx:26,180-184` | `<input>` de texto plano (`placeholder="Marca"`), sin autocompletado ni validación |
| Endpoint que recibe esa alta | `backend/src/modules/products/routes.ts:168,175` | `POST /admin/products/alta-rapida` — inserta `brand: brand ?? null` tal cual, sin tocar ningún catálogo |
| Schema de ese endpoint | `packages/shared/src/schemas/product.ts:66-74` | `altaRapidaSchema.brand` — mismo `brandText`, opcional |
| CRUD normal de producto | `backend/src/modules/products/routes.ts` (create/update, no listado arriba) | Mismo campo `brand` de texto en `createProductSchema`/`updateProductSchema` |

**Dos puntos de entrada independientes** (admin y PWA) escriben el mismo campo de
texto sin compartir ninguna fuente de verdad — de ahí el problema real que
dispara esta tarea: nada impide que un local quede con `"Nike"`, `"nike"` y
`"NIKE "` como si fueran tres marcas distintas.

## 3. Consumo de `brand` en la tienda pública

`brand` no es solo un dato de producto — hoy alimenta filtros y listados en
varios lugares de `backend/src/modules/public/routes.ts`:

| Línea(s) | Qué hace |
|---|---|
| `66` | Filtro del home/catálogo: `eq(products.brand, query.marca)` — **match exacto de texto**, sensible a como esté tipeado |
| `167,181,214` | Devuelve `brand` en las tarjetas de producto de las secciones del home |
| `280,301-303,326` | En el endpoint de productos por categoría: junta valores distintos con `selectDistinct(products.brand)` para armar la lista de marcas del sidebar de filtros (`marcas: [...]`) |
| `376,397-400,423` | Mismo patrón, pero en el endpoint de productos por **colección** (`/public/:slug/collections/:collectionSlug/products`) |
| `473` | Ficha de producto (`/public/:slug/products/:id` o similar): devuelve `brand` para el `pdv-brand` de la vista de detalle |

Y en el frontend, `frontend/src/features/store/pages/CategoryPage.tsx` (compartido
entre modo `category` y `collection`, ver comentario T21/02 líneas 13-15):
- Líneas 61,68,166,178 — hay un filtro de marca (`marca`/`appliedMarca`) que ya
  convive con talle/color/precio, un solo valor a la vez.
- Líneas 282-284+ — el sidebar renderiza `data.availableFilters.marcas` como
  chips clickeables, igual que talle — **la lista de marcas del filtro ya
  existe visualmente, solo que hoy sale de texto libre distinto por producto**.

Y `frontend/src/features/admin/types.ts:328-345` (`HomeSectionItem.products[].brand`)
y `backend/src/modules/homeSections/routes.ts:78,98,139` — el preview de
secciones del home en el admin también expone `brand` (solo lectura/display).

También aparece en `backend/src/modules/variants/routes.ts:47` — un listado de
variantes (probablemente stock/escaneo) que devuelve `product.brand` junto con
nombre y precio, solo para mostrar, no para filtrar.

**Conclusión de esta sección:** mover `brand` a una tabla propia no es solo
"agregar un combo en dos formularios" — toca el filtro de marca de la tienda
(hoy por texto exacto), la lista de marcas disponibles de ese filtro (hoy
`selectDistinct`), y todo lugar que hoy imprime `product.brand` como string.

## 4. El patrón a clonar ya existe: Categorías / Colecciones

No hay que inventar nada nuevo — Categorías y Colecciones son exactamente el
catálogo simple que necesitamos, y están duplicadas 1:1 hoy:

- **Schema**: `categories`/`collections` en `schema.ts:62-105` — `id, orgId,
  name, slug, imageUrl, active, createdAt, updatedAt`, `unique(orgId, slug)`.
- **Backend CRUD**: `backend/src/modules/collections/routes.ts` (175 líneas) —
  `GET` lista, `POST` crea (valida slug único, líneas 41-47), `PATCH` edita
  (61-91), `POST /:id/image` sube imagen a Supabase Storage (93-149), `DELETE`
  borra con cascada simple (151-174). `categories/routes.ts` es el mismo
  patrón.
- **Frontend admin — componente genérico**: `TaxonomyManager.tsx` (271 líneas)
  recibe `{ title, endpoint, noun, hideTitle }` y ya resuelve alta
  (nombre+slug con autogeneración de slug), tabla con edición inline, toggle
  `active`, subida/cambio de imagen y borrado. **No hace falta escribir un
  componente nuevo para el admin de marcas** — se reutiliza tal cual.
- **Tipo genérico**: `Taxonomy` en `frontend/src/features/admin/types.ts:23-31`
  (`id, name, slug, imageUrl, active`) — ya sirve para `brands` sin cambios.
- **Dónde vive en el admin**: `ProductsPage.tsx:9-15,242-248` — tabs
  `Todos los productos / Categorías / Colecciones / Stock` vía `?tab=`, cada
  una renderiza `<TaxonomyManager endpoint="/admin/..." noun="..." />`. Un tab
  más (`marcas`) es un cambio de ~3 líneas.
- **Menú lateral**: `AdminLayout.tsx:22-41` (`NAV_GROUPS`) — Categorías/Stock/
  Colecciones **no tienen ítem propio en el menú**, viven solo como tabs de
  "Productos" (comentario línea 19-21 lo confirma explícitamente). Marcas debe
  seguir el mismo criterio.
- **Storefront — índice**: `CategoriesIndexPage.tsx` — tabs Categorías/
  Colecciones sobre `.cat-banner`/`.tabs-bar` (`catalog.css:380-443`), con
  grillas `cat-hero-card`/`col-card` (placeholder navy+coral cuando no hay
  foto, foto real si el admin subió una).
- **Storefront — página individual**: `CategoryPage.tsx` con `mode: "category"
  | "collection"` (T21/02, mismo componente para ambas, ver comentario líneas
  13-15) — banner + toolbar + sidebar de filtros + grilla + paginación.
- **Público — endpoint de listado por ítem**: `GET
  /public/:slug/collections/:collectionSlug/products` (`public/routes.ts:332-419`)
  — resuelve por slug, pagina, filtra por talle/color, devuelve `availableFilters`.

## 5. Diferencia importante con Categorías/Colecciones: curación vs. automático

`CategoriesIndexPage.tsx:6-13,32-33` — Categorías y Colecciones **no muestran
"todas"**: leen de `GET /public/:slug/home` y filtran las que están en
`home_sections` (comentario explícito: *"categorías ocultas del home no
aparecen acá, y colecciones solo se ven si un admin las agregó a esa
pantalla"*). Es decir, hoy ambas dependen de curación manual vía
`home_sections` (`homeSectionRefType` en `schema.ts:19` solo admite
`"category" | "collection"`).

Marca no calza en ese modelo: es más un filtro de catálogo que una pieza de
merchandising curada. La decisión tomada en esta conversación es que el tab
Marcas liste **todas las marcas activas con al menos un producto visible**,
sin pasar por `home_sections` — esto simplifica el backend (no hay que tocar
`homeSectionRefType` ni la lógica de curación) pero es una asimetría real
frente a cómo funcionan hoy sus dos vecinas de tab, y vale dejarla explícita en
el plan.

## 6. Corrección sobre el mockup visual ya mostrado

El mockup (`https://claude.ai/artifact/ASKyNVyE2xhgKemn4vvxY8`) dibujó un header
con enlaces fijos "Inicio / Explorar / Novedades / Ofertas" — **eso no existe
en el código real** y no debe tomarse como referencia. El header real
(`frontend/src/features/store/StoreLayout.tsx:184,296-305,364-368`) arma la nav
dinámicamente: `navCategories` (categorías reales del tenant, vía
`/public/:slug/config`) + un link fijo "Ver todo" que apunta a
`/store/:slug/categorias` (la página de tabs). **No hay que agregar "Marcas" al
header** — el mismo link "Ver todo" ya lleva a la página de tabs donde
agregamos la pestaña nueva; es consistente con que Categorías/Colecciones
tampoco tienen su propio link en el header.

## 7. Decisiones ya tomadas en esta conversación

1. **Alta inline desde el combo**: en el punto de carga (PWA y admin), si la
   marca tipeada no existe, se ofrece crearla al vuelo — no se obliga a
   interrumpir la carga para ir al admin primero.
2. **Migración automática**: al crear la tabla `brands`, se migran los valores
   distintos y no vacíos que ya existen en `products.brand`, y cada producto
   queda enlazado a su marca migrada. Sin trabajo manual, sin pérdida de datos.
3. **Ubicación en el admin**: tab dentro de "Productos" (`?tab=marcas`), igual
   que Categorías/Colecciones — no un ítem nuevo en el menú lateral.
4. **Listado en la tienda**: automático (toda marca activa con productos
   visibles), no curado por `home_sections` (ver sección 5).
5. **`products.brand` (texto) se borra** en la misma tarea de migración, una
   vez que el backfill de `brandId` está confirmado — no queda como fallback.
6. **Logo de marca sí entra en el alcance** ahora (no se posterga como pasó con
   categorías) — `TaxonomyManager` ya soporta subida de imagen sin cambios,
   así que es prácticamente gratis incluirlo de entrada.
7. **El filtro `?marca=` en la URL pasa a usar el slug** de la marca (ej.
   `?marca=taverniti`) en vez del nombre — consistente con cómo ya funciona la
   URL de categoría/colección. Un link viejo compartido con el nombre deja de
   filtrar (la página sigue cargando, solo no aplica ese filtro) — se acepta
   esa rotura menor a cambio de no mantener doble lógica de matching.

## 8. Inventario de cambios (detalle para `plan.md`)

**Backend**
- Tabla `brands` (mismo shape que `collections`) + FK `products.brandId`.
- Migración: sembrar `brands` desde `products.brand` distintos + backfill de
  `brandId` en productos existentes.
- `backend/src/modules/brands/routes.ts` — clon de `collections/routes.ts`.
- `POST /admin/products/alta-rapida` (`products/routes.ts:168-175`) — pasa a
  recibir `brandId` (con alta inline si el nombre no matchea ninguna marca
  existente) en vez de `brand` texto.
- CRUD normal de producto (`createProductSchema`/`updateProductSchema`) — ídem.
- `public/routes.ts` — los 5 puntos de la sección 3: el filtro `query.marca`
  pasa a resolver contra `brands` (por slug o id, no por texto exacto), y los
  `selectDistinct(products.brand)` de las líneas 301-303/397-400 se reemplazan
  por un join contra `brands`.
- Nuevo endpoint espejo: `GET /public/:slug/brands/:brandSlug/products` (clon
  de `collections/:collectionSlug/products`, sección 4).
- `products.brand` (texto) se borra en la misma tarea, después del backfill de
  `brandId` (decisión 5, sección 7).

**Admin web**
- Nuevo tab "Marcas" en `ProductsPage.tsx` → `<TaxonomyManager endpoint="/admin/brands" noun="marca" hideTitle />` (sin componente nuevo).
- `ProductEditPage.tsx:247-260` — el input+datalist se reemplaza por un
  combobox contra `GET /admin/brands`, con alta inline.
- Eliminar `SUGGESTED_BRANDS` (`types.ts:89`) y el `<datalist>` asociado.
- `ProductBase.brand: string | null` (`types.ts:62`) pasa a algo como
  `brandId: string | null` + `brandName` para mostrar en listados.

**PWA (alta por QR)**
- `AltaScreen.tsx:180-184` — el input de texto plano se reemplaza por el mismo
  combobox con alta inline, contra el mismo endpoint `GET /admin/brands`.

**Storefront**
- Nuevo tab "Marcas" en `CategoriesIndexPage.tsx`, listado automático (no
  `home_sections`), tarjetas estilo `col-card`.
- Nueva ruta `/store/:slug/m/:brandSlug` con `CategoryPage.tsx` en un tercer
  modo `"brand"` (mismo componente, mismo criterio que T21/02 para
  category/collection).
- Sidebar de filtro de marca (`CategoryPage.tsx:282-284`) — sigue funcionando
  igual visualmente, pero la lista `availableFilters.marcas` pasa a venir de la
  tabla `brands`, no de texto distinto.
- Sin cambios en el header (sección 6).

## 9. Preguntas cerradas — todas resueltas (ver sección 7, decisiones 5-7)

Las tres preguntas que quedaban abiertas (logo, borrado de `brand` legacy, y
formato de `?marca=` en la URL) ya están resueltas y listadas en la sección 7.
Sin puntos pendientes — `plan.md` puede partir de este análisis sin supuestos.
