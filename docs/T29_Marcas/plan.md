# Plan — Marcas como catálogo propio

Basado en `analisis.md` (inventario completo + decisiones 1-7 de la sección 7).
Tareas en orden de dependencia: primero la base de datos, después quien la
escribe (backend admin), después quien la usa para escribir (admin web/PWA),
por último quien la lee en público (storefront). No arrancar una tarea sin
haber cerrado la anterior — cada una deja el sistema funcionando de punta a
punta (no hay tareas a medio camino que rompan producción).

## Desglose en tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-schema-y-migracion](tareas/01-schema-y-migracion/01-schema-y-migracion.md) — tabla `brands` + backfill + borrado de `products.brand` | nada | ✅ Hecha |
| 2 | [02-backend-crud-marcas](tareas/02-backend-crud-marcas/02-backend-crud-marcas.md) — CRUD de marcas + `alta-rapida` actualizado | 1 | ✅ Hecha |
| 3 | [03-admin-seccion-marcas](tareas/03-admin-seccion-marcas/03-admin-seccion-marcas.md) — tab Marcas + combo en ficha de producto | 2 | ✅ Hecha |
| 4 | [04-pwa-combo-marca](tareas/04-pwa-combo-marca/04-pwa-combo-marca.md) — combo de marca en alta por QR | 2 | ✅ Hecha |
| 5 | [05-backend-publico-filtros](tareas/05-backend-publico-filtros/05-backend-publico-filtros.md) — lee `brands` (filtro sigue por nombre hasta la Tarea 6) + endpoint de marca | 1 | ✅ Hecha |
| 6 | [06-storefront-navegar-marca](tareas/06-storefront-navegar-marca/06-storefront-navegar-marca.md) — tab Marcas + página individual + cierre del pase a slug | 5 | ✅ Hecha |
| 7 | [07-verificacion-final](tareas/07-verificacion-final/07-verificacion-final.md) — checklist en vivo | 1-6 | ✅ Hecha |

**T29_Marcas completo — las 7 tareas hechas y verificadas.**

## T29/01 — Schema + migración de datos

**Objetivo**: tabla `brands` creada, productos existentes migrados, columna
vieja borrada.

**Alcance**
- `backend/src/db/schema.ts` — tabla `brands` (mismo shape que `collections`,
  ver `analisis.md` sección 4): `id, orgId, name, slug, imageUrl, active,
  createdAt, updatedAt`, `unique(orgId, slug)`.
- `products.brandId` — FK nullable a `brands.id`.
- Script de migración (corre directo contra Supabase remoto, como el resto de
  las migraciones del proyecto — no vía la app):
  1. Por cada `orgId`, junta los valores distintos y no vacíos de
     `products.brand` (trim + case tal cual están, sin normalizar mayúsculas
     — si dos productos difieren solo en mayúsculas quedan como dos marcas
     separadas; revisar a mano si aparece un caso así antes de correr en
     prod).
  2. Inserta una fila en `brands` por cada valor (slug generado igual que
     `slugify()` del admin), `active: true`.
  3. Actualiza `products.brandId` con el id correspondiente.
  4. Verifica: ningún producto con `brand` no nulo debería quedar con
     `brandId` nulo después del paso 3.
- Borra la columna `products.brand` (decisión 5) — **último paso**, solo
  después de correr y verificar la migración en Supabase.

**Fuera de alcance**: nada todavía lee/escribe `brandId` — este paso es solo
de datos.

**Criterio de aceptación**: `select count(*) from products where brand_id is
null` da el mismo número de productos que antes tenían `brand` vacío/nulo (no
se perdió ninguna marca en el camino). `products.brand` ya no existe en el
schema.

## T29/02 — Backend: CRUD de marcas

**Objetivo**: API de administración de marcas, funcionalmente idéntica a la
de colecciones.

**Alcance**
- `backend/src/modules/brands/routes.ts` — clon de
  `backend/src/modules/collections/routes.ts` (`analisis.md` sección 4):
  `GET /admin/brands`, `POST /admin/brands` (valida slug único), `PATCH
  /admin/brands/:id`, `POST /admin/brands/:id/image`, `DELETE
  /admin/brands/:id`.
- Registrar el módulo donde se registran `collectionsRoutes`/`categoriesRoutes`.
- `createProductSchema`/`updateProductSchema`/`altaRapidaSchema`
  (`packages/shared/src/schemas/product.ts`) — `brand: brandText` se
  reemplaza por `brandId: z.string().uuid().nullable()`.
- `products/routes.ts:168-175` (`alta-rapida`) — recibe `brandId` en vez de
  `brand`; si el front manda un nombre nuevo (alta inline), primero crea la
  marca (o la reutiliza si el slug ya existe) y después crea el producto con
  ese `brandId`. Definir el contrato exacto: ¿el front manda `brandId` *o*
  `newBrandName`, resolviéndose en un solo POST? — más simple para el
  frontend que forzar dos requests separados.

**Fuera de alcance**: nada del admin web/PWA/storefront todavía llama a estos
endpoints.

**Criterio de aceptación**: se puede crear/editar/borrar una marca por API
igual que una colección, incluyendo imagen. `alta-rapida` acepta `brandId` de
una marca existente y también alta inline de una nueva.

## T29/03 — Admin web: sección Marcas + combo en ficha de producto

**Objetivo**: el admin puede dar de alta marcas y elegirlas desde combo al
cargar/editar un producto.

**Alcance**
- `ProductsPage.tsx:9-15,242-248` — nuevo tab `marcas` →
  `<TaxonomyManager title="Marcas" endpoint="/admin/brands" noun="marca"
  hideTitle />` (componente ya existe, sin cambios — `analisis.md` sección 4).
- `ProductEditPage.tsx:247-260` — el input+datalist se reemplaza por un
  combobox: lista `GET /admin/brands`, permite escribir y filtrar, y si no
  hay match ofrece "Crear marca “X”" (alta inline, decisión 1).
- `types.ts:23-31,54-66,89` — `Taxonomy` se reutiliza tal cual para `brands`;
  `ProductBase.brand: string | null` → `brandId: string | null` +
  `brandName: string | null` (para mostrar en la lista de productos sin un
  segundo fetch); se borra `SUGGESTED_BRANDS`.
- `AdminLayout.tsx` — sin cambios (Marcas vive como tab, no como ítem de menú,
  decisión 3).

**Fuera de alcance**: PWA, storefront.

**Criterio de aceptación**: desde "Productos → Marcas" se puede crear/editar/
borrar/subir logo de una marca. Al editar un producto, el campo Marca es un
combo que lista las marcas existentes y permite crear una nueva sin salir del
formulario.

## T29/04 — PWA: combo de marca en alta por QR

**Objetivo**: mismo combo + alta inline en el flujo de escaneo.

**Alcance**
- `pwa/src/screens/AltaScreen.tsx:180-184` — el `<input placeholder="Marca">`
  se reemplaza por un combobox contra `GET /admin/brands` (la PWA ya llama
  `/admin/categories` con la misma autenticación, mismo patrón).
- `handleSubmit` (líneas 46-81) — manda `brandId` (o el nombre nuevo para alta
  inline) al `POST /admin/products/alta-rapida` actualizado en T29/02.

**Fuera de alcance**: cualquier otra pantalla de la PWA.

**Criterio de aceptación**: al escanear un código y cargar un producto nuevo,
el campo Marca es un combo — elegir una marca existente o escribir una nueva
(que se crea y queda disponible para la próxima carga) funciona sin salir de
la pantalla de alta.

## T29/05 — Backend público: filtros y endpoint de marca

**Objetivo**: la tienda pública lee `brand` desde la tabla nueva, no desde
texto.

**Alcance** (todo en `backend/src/modules/public/routes.ts`, ver `analisis.md`
sección 3)
- Línea 66 — el filtro `eq(products.brand, query.marca)` pasa a resolver
  `query.marca` como **slug de marca** (decisión 7) y filtrar por
  `products.brandId`.
- Líneas 167,181,214,280,376,473 — donde se devolvía `brand: products.brand`
  como string, pasa a un join con `brands` devolviendo `{ name, slug }`.
- Líneas 301-303,397-400 (`selectDistinct(products.brand)` para
  `availableFilters.marcas`) — se reemplazan por un join/distinct contra
  `brands` (nombre + slug, para que el frontend pueda armar el link/valor del
  filtro por slug).
- Nuevo endpoint `GET /public/:slug/brands/:brandSlug/products` — clon de
  `GET /public/:slug/collections/:collectionSlug/products` (líneas 332-419):
  busca la marca por slug, pagina, filtra por talle/color, devuelve
  `availableFilters`.

**Fuera de alcance**: frontend del storefront (siguiente tarea) — esta tarea
deja la API lista pero nada la consume todavía nuevo.

**Criterio de aceptación**: `GET /public/:slug/brands/taverniti/products`
devuelve los productos de esa marca paginados. El filtro `?marca=taverniti`
en el endpoint de categoría/colección sigue funcionando, ahora por slug.

## T29/06 — Storefront: navegar por marca

**Objetivo**: el comprador puede explorar y filtrar por marca en la tienda.

**Alcance**
- `CategoriesIndexPage.tsx` — tercer tab "Marcas", listado **automático** (no
  vía `home_sections`, decisión 4/sección 5 del análisis): pide todas las
  marcas activas con productos visibles, tarjetas estilo `col-card`
  (`catalog.css:425-433`), con logo si la marca tiene imagen (T29/03).
- Nueva ruta `/store/:slug/m/:brandSlug` → `CategoryPage.tsx` con un tercer
  `mode: "category" | "collection" | "brand"` (mismo componente, mismo
  criterio que T21/02 aplicó a category/collection) — banner, toolbar,
  sidebar de filtros, grilla, paginación, consumiendo el endpoint de T29/05.
- Sidebar de filtro de marca (`CategoryPage.tsx:282-284`, dentro de la vista
  de categoría/colección) — sigue igual visualmente; el valor de cada chip
  pasa a ser el slug de la marca en vez del nombre.
- Sin cambios en `StoreLayout.tsx` (header) — confirmado en `analisis.md`
  sección 6, la nav no necesita un link nuevo.

**Fuera de alcance**: ninguno adicional — esta es la última tarea funcional.

**Criterio de aceptación**: desde "Explorá la tienda" se puede entrar a la
pestaña Marcas, ver todas las marcas con stock visible, entrar a una y ver sus
productos paginados/filtrables. El filtro de marca dentro de una categoría
también sigue funcionando.

## T29/07 — Verificación final

**Objetivo**: circuito completo probado a mano en el navegador (no solo
tipos/build), siguiendo la preferencia ya establecida en el proyecto de
verificar en vivo antes de dar por cerrada una tarea de UI.

**Checklist**
- [ ] Admin → Productos → Marcas: alta, edición, logo, borrado.
- [ ] Admin → ficha de producto: combo de marca, alta inline de una marca
      nueva desde ahí.
- [ ] PWA: alta por QR con combo de marca + alta inline.
- [ ] Storefront: tab Marcas en "Explorá la tienda", página individual de una
      marca, filtro de marca dentro de una categoría.
- [ ] Confirmar que ningún producto quedó con marca "perdida" (comparar contra
      el conteo pre-migración de T29/01).
- [ ] `products.brand` ya no existe; no queda ningún import/referencia muerta
      a `SUGGESTED_BRANDS` ni al campo viejo en el código.
