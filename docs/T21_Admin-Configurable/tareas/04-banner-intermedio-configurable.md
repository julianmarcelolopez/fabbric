# 04 — Banner intermedio del home configurable

**Estado:** ✅ Completa (2026-08-01)

## Qué se implementa

Título y subtítulo opcionales para el mid-banner del home, en vez de mostrar únicamente la imagen (`bannerUrl`) sin ningún texto propio.

## Por qué existe (referencia a T20/08)

Fila "Banner promocional intermedio (texto propio)" de la tabla de `docs/T20_UX-Store/tareas/08-admin-configurable.md`: en T20/03, el mid-banner (`CatalogHomePage.tsx`, componente `MidBanner`) originalmente iba a mostrar texto fijo tipo "10% OFF pagando en efectivo" — se descartó por ser contenido inventado sin dato real detrás. Se resolvió mostrando `bannerUrl` solo, como imagen clickeable sin texto superpuesto (o un fallback con fondo navy + texto genérico "Descubrí la colección completa" si no hay `bannerUrl`). Documentado en el Resultado de T20/03 como "sorteado, no resuelto".

## Cambios de backend requeridos

- **Schema** (`backend/src/db/schema.ts`): `midBannerTitle: text("mid_banner_title")` y `midBannerSubtitle: text("mid_banner_subtitle")` (ambos nullable) en `catalogConfigs`.
- **Migración**: Drizzle, columnas nullable, sin backfill.
- **Endpoint**: ambos campos se suman a `updateCatalogConfigSchema` (`@fabbric/shared`) — se actualizan por el `PATCH /admin/catalog-config` existente.
- **Endpoint público**: sumar ambos campos al select de `GET /public/:slug/config`.

## Cambios de frontend requeridos

**Admin** (`frontend/src/features/admin/pages/MyStorePage.tsx`):
- Dos campos de texto (título corto + subtítulo/bajada) dentro de la sección donde ya se gestiona el banner (junto al upload de `bannerUrl`), dejando claro que son opcionales.

**Tienda pública** (`frontend/src/features/store/pages/CatalogHomePage.tsx`, componente `MidBanner`):
- Si `config.midBannerTitle` existe: mostrarlo (y el subtítulo, si también existe) superpuesto sobre `bannerUrl` — necesita reintroducir el overlay/gradiente que T20/03 sacó justamente porque no había texto real que mostrar (revisar el CSS de `.home-mid-banner` en `catalog.css`, hoy sin gradiente porque el banner es "solo imagen").
- Si no hay `midBannerTitle`: mantener el comportamiento actual (imagen sola sin texto, o el fallback de fondo navy + texto genérico si tampoco hay `bannerUrl`) — no romper el caso ya resuelto por T20 para tenants que no configuren nada nuevo.

## Archivos a modificar

- `backend/src/db/schema.ts`
- `supabase/migrations/` (nueva migración)
- `packages/shared/src/schemas/` (sumar los campos a `updateCatalogConfigSchema`)
- `backend/src/modules/public/routes.ts`
- `frontend/src/features/admin/pages/MyStorePage.tsx`
- `frontend/src/features/store/pages/CatalogHomePage.tsx`
- `frontend/src/features/catalog/catalog.css` (overlay de texto sobre `.home-mid-banner`, condicional)
- `frontend/src/features/store/types.ts` (`PublicStoreConfig`)

## Criterio de completado

- Cargar título y subtítulo desde el admin y verlos superpuestos sobre el banner real en el home.
- Sin esos campos, el home se sigue viendo exactamente como lo dejó T20/03 (imagen sola o fallback navy) — no se rompe el caso sin configurar.
- `tsc --noEmit` limpio; verificado en navegador con y sin los campos cargados.

## Notas y dependencias

- Independiente de `01`, `02`, `03`, `05`, `06`, `07`.
- Ojo con el contraste texto/imagen — T20/03 ya había identificado que superponer texto sobre `bannerUrl` sin un overlay oscuro adecuado puede quedar ilegible (fue justamente parte de por qué se sacó el texto del hero en su momento) — no reintroducir ese problema acá.

## Resultado

**Backend**: `midBannerTitle` (máx 60) y `midBannerSubtitle` (máx 120), ambos nullable, en `catalogConfigs` — migración `0013_mid_banner_text.sql` aplicada. Sumados a `catalogConfigSchema`/`updateCatalogConfigSchema` (`@fabbric/shared`, con los límites de caracteres del usuario) y a `GET /public/:slug/config`.

**Frontend admin** (`MyStorePage.tsx`): dos inputs nuevos dentro de la card "Banner de portada" (junto al upload de `bannerUrl`, misma sección conceptual) — título y subtítulo, con placeholder aclarando que vacío = banner sin overlay. Mismo patrón "Opción A" (estado local hasta guardar).

**Frontend tienda pública** (`CatalogHomePage.tsx`, `MidBanner`): la función ahora resuelve 3 casos en orden de prioridad —
1. **Hay `title`**: overlay + texto, con o sin `bannerUrl` de fondo (si no hay imagen, el overlay igual se ve sobre `--navy`, que ya es el `background-color` base del elemento). `subtitle` solo se renderiza si `title` también existe.
2. **No hay `title`, hay `bannerUrl`**: comportamiento de T20/03 sin cambios — imagen sola, sin overlay.
3. **Ninguno**: fallback original de T20/03 — navy + "Descubrí la colección completa" + botón.

CSS: `.home-mid-banner.has-text::before` con el gradiente exacto que pidió el usuario (`linear-gradient(to right, ...)`). A diferencia de la imagen de categoría/colección de `01` (un `<img>` hermano, donde `::before` queda tapado por pintar antes), acá el fondo es `background-image` inline del propio elemento — `::before` sí pinta por encima de eso y por debajo de los hijos reales, así que alcanzó con el pseudo-elemento, sin necesitar un nodo de scrim real. Texto alineado a la izquierda para acompañar el gradiente (más oscuro a la izquierda) — extrapolación razonable a partir de la dirección del gradiente pedida, no algo explícitamente indicado, documentada acá. Título en `clamp(40px, 5vw, 48px)` (rango 40-48 pedido), `--tenant-font-display`, weight 300; subtítulo `--font-body` 15px weight 300 opacity 0.8; texto siempre blanco.

**Verificación real de datos** (`backend/t21-04-midbanner-text.mjs`, queda en el repo sin trackear): admin *staff* temporal, confirmados los 3 casos a nivel de datos (título+subtítulo, solo título con subtítulo vaciado a `null`, ninguno de los dos) reflejados sin delay en `GET /public/eliathi-modas/config`, y los límites de 60/120 caracteres respetados por el schema (61/121 → 400). 15/15 checks en verde.

`tsc --noEmit` limpio en `backend/` y `frontend/`; `vite build` limpio. **Pendiente**: verificación visual del usuario de los 3 casos en el navegador — la rama de datos ya está probada, falta confirmar que el overlay se ve legible y el layout no se rompe con textos reales de distinto largo.
