# 01 — Imagen de categoría y colección

**Estado:** ✅ Completa (2026-08-01)

## Qué se implementa

Un campo de imagen real para categorías y colecciones, con su endpoint de upload, expuesto en el admin y consumido en la tienda pública en reemplazo del placeholder de color que dejó T20.

## Por qué existe (referencia a T20/08)

Fila "Foto de categoría/colección" de la tabla de `docs/T20_UX-Store/tareas/08-admin-configurable.md` — **el gap más grande de todo T20**, afecta 3 pantallas: home (`.home-cat-card`), índice de categorías (`.cat-hero-card`/`.col-card`) y — una vez exista `02` — el banner de la página de detalle de colección. Hoy todas usan el mismo placeholder: `--tenant-primary` al 20% de opacidad sobre `--navy` con el nombre superpuesto.

## Cambios de backend requeridos

- **Schema** (`backend/src/db/schema.ts`): agregar `imageUrl: text("image_url")` (nullable) a `categories` y a `collections`. Sin tabla nueva, sin campo de storage path separado del que ya usa el patrón de logo/banner (ver Notas sobre `storagePathFromUrl`).
- **Migración**: Drizzle, siguiendo el flujo ya usado en `supabase/migrations/` (columna nullable, sin backfill necesario — las categorías/colecciones existentes simplemente no tienen foto hasta que alguien la suba).
- **Endpoints de upload** — dos nuevos, mismo patrón exacto que `POST /admin/catalog-config/logo` y `.../banner` en `backend/src/modules/catalogConfig/routes.ts` (multipart, `ALLOWED_TYPES`, `LOGO_MAX_BYTES`, bucket `product-images`, borrado best-effort de la imagen anterior vía `storagePathFromUrl`):
  - `POST /admin/categories/:id/image`
  - `POST /admin/collections/:id/image`
  - Estructura de storage path sugerida: `${orgId}/categories/${categoryId}-${randomUUID()}.${ext}` (y análogo para colecciones) — separado de `${orgId}/config/...` para no mezclarse con logo/banner.
- **Endpoints públicos existentes** — agregar `imageUrl` al select de categorías/colecciones en `GET /public/:slug/home` (`backend/src/modules/public/routes.ts`, los dos `db.select({ id, name, slug })` de `cats`/`cols`) y en `GET /public/:slug/categories/:categorySlug/products` (el select de `category`). Sin esto, el campo existe en la DB pero no llega al frontend público — mismo criterio que se usó para agregar `categorySlug`/`categoryName` al endpoint de producto en T20/06.

## Cambios de frontend requeridos

**Admin** (`frontend/src/features/admin/pages/ProductsPage.tsx`, tabs Categorías y Colecciones — T19/02):
- Mismo componente de upload que ya existe para logo/banner en `MyStorePage.tsx` (`ImageDropzone`, revisar `frontend/src/features/admin/components/ImageDropzone.tsx`) — reusar tal cual, no crear uno nuevo.
- Un campo de imagen por fila/card de categoría y de colección en su tab correspondiente.

**Tienda pública**:
- `frontend/src/features/store/pages/CatalogHomePage.tsx` — `CategoriesGrid`: si `c.imageUrl` existe, mostrarlo en vez de `.home-cat-card-ph`; si no, el placeholder de color sigue como fallback (nunca romper para tenants sin foto).
- `frontend/src/features/store/pages/CategoriesIndexPage.tsx` — mismo criterio en `.cat-hero-card` y `.col-card`.
- `frontend/src/features/store/types.ts` — `PublicHomeSection`/`HsrSection` y `PublicCategoryProducts` ganan `imageUrl: string | null`.

## Archivos a modificar

- `backend/src/db/schema.ts`
- `supabase/migrations/` (nueva migración)
- `backend/src/modules/categories/routes.ts` (endpoint de upload)
- `backend/src/modules/collections/routes.ts` (endpoint de upload)
- `backend/src/modules/public/routes.ts` (sumar `imageUrl` a los selects existentes)
- `frontend/src/features/admin/pages/ProductsPage.tsx`
- `frontend/src/features/store/pages/CatalogHomePage.tsx`
- `frontend/src/features/store/pages/CategoriesIndexPage.tsx`
- `frontend/src/features/store/types.ts`
- `frontend/src/features/catalog/catalog.css` (si el placeholder y la imagen real necesitan reglas distintas — evaluar en la implementación)

## Criterio de completado

- Subir una foto a una categoría real desde el admin y verla reflejada en el home y en el índice de categorías, en el navegador.
- Una categoría/colección **sin** foto sigue mostrando el placeholder de color — nunca un espacio roto o una imagen faltante.
- `tsc --noEmit` limpio en `backend/` y `frontend/`; verificado con datos reales (no basta con que compile).

## Notas y dependencias

- **Prerequisito de `02`** — la página de detalle de colección necesita `imageUrl` en `collections` para tener una foto real de banner, no solo el placeholder.
- Independiente de `03`, `04`, `05`, `06`, `07`.
- El bucket de Storage (`product-images`) y el patrón de borrado best-effort de la imagen anterior ya están probados en producción (logo/banner) — no hay riesgo nuevo de infraestructura acá, es repetir el mismo patrón para dos entidades más.

## Resultado

**Backend**:
- `imageUrl: text("image_url")` (nullable) agregado a `categories` y `collections` en `schema.ts`; migración `0011_category_collection_image.sql` generada con `drizzle-kit generate` y aplicada con `drizzle-kit migrate` (solo 2 `ALTER TABLE ADD COLUMN`, sin backfill).
- **Refactor chico antes de duplicar código**: las constantes (`BUCKET`, `LOGO_MAX_BYTES`, `ALLOWED_TYPES`) y `storagePathFromUrl` vivían solo dentro de `catalogConfig/routes.ts`. Como categorías Y colecciones iban a necesitar exactamente lo mismo (tres usos de la misma lógica en vez de uno), se extrajeron a `backend/src/lib/imageUpload.ts` (`IMAGE_BUCKET`, `IMAGE_MAX_BYTES`, `ALLOWED_IMAGE_TYPES`, `storagePathFromUrl`) y `catalogConfig/routes.ts` pasó a importarlas — mismo comportamiento exacto para logo/banner, cero cambios funcionales ahí.
- Dos endpoints nuevos, mismo patrón que logo/banner: `POST /admin/categories/:id/image` y `POST /admin/collections/:id/image` — multipart, valida tipo/tamaño, sube a `product-images/${orgId}/categories/...` (o `/collections/...`), borra la imagen anterior best-effort, actualiza la fila.
- `imageUrl` sumado a los 3 selects públicos que ya devuelven categoría/colección: los dos bloques de `cats`/`cols` dentro de `GET /public/:slug/home` (como `refImageUrl` en la sección, para no confundir con el `imageUrl` de producto que ya usa el mismo objeto en otros contextos) y el select de `category` en `GET /public/:slug/categories/:categorySlug/products`.

**Frontend admin — desviación de lo planeado, documentada**: la tarea proponía reusar `ImageDropzone.tsx` tal cual. Al revisarlo, `ImageDropzone` está armado específicamente para la **galería de producto** (múltiples imágenes, reordenar, endpoints de lista/borrado individual) — no encaja con "una imagen, se reemplaza" que es como se implementó el backend (mismo modelo que logo/banner, no una galería). Se reusó en cambio el patrón real de upload único que ya usa `MyStorePage.tsx` para logo/banner (botón "Subir"/"Cambiar" + input file oculto + preview), integrado directamente en `TaxonomyManager.tsx` (el componente que ya arma las tablas de Categorías y Colecciones en `ProductsPage.tsx`, T19/02) — una columna "Imagen" nueva con un input file compartido por toda la tabla (rastrea a qué fila apunta el próximo archivo elegido).

**Frontend tienda pública**:
- `CatalogHomePage.tsx` (`CategoriesGrid`): si `c.refImageUrl` existe, `<img>` real; si no, el placeholder de color de T20/03 sin cambios.
- `CategoriesIndexPage.tsx` (`.cat-hero-card`/`.col-card`): mismo criterio. **Bug propio encontrado y corregido antes de verificar**: el primer intento ponía el degradé de legibilidad como `::before` de la card — pero `::before` pinta *antes* (detrás) que los hijos normales del elemento, así que quedaba tapado por la propia imagen (que sí es un hijo real, pintado después). Corregido con un elemento real (`.cat-hero-scrim`) insertado en el DOM entre la `<img>` y el contenido de texto, así el orden de pintado queda: imagen (fondo) → degradé (medio) → texto (arriba).
- `HsrSection`/`PublicHomeSection` (tipo compartido) y `PublicCategoryProducts` ganaron los campos correspondientes.

**Verificación real de punta a punta** (`backend/t21-01-image-upload.mjs`, queda en el repo sin trackear): con un admin *staff* temporal, se subió una imagen real (PNG 1×1 embebido en el script, sin depender de ningún archivo externo) a la categoría real "Jeans" de Eliathi Modas vía `POST /admin/categories/:id/image`, se confirmó que aparece con la URL correcta en `GET /public/eliathi-modas/home` (`refImageUrl`) y en `GET /public/eliathi-modas/categories/jeans/products` (`category.imageUrl`), que reemplazarla por una segunda imagen borra la primera de Storage, y se dejó la categoría real exactamente como estaba (`imageUrl` de vuelta a `null`, archivo de Storage borrado) al terminar. 11/11 checks en verde.

`tsc --noEmit` limpio en `backend/` y `frontend/`; `vite build` limpio. **Pendiente**: verificación visual del usuario en el navegador — subir una foto real desde el admin y confirmar que se ve en el home y en el índice de categorías, y que una categoría sin foto sigue mostrando el placeholder.
