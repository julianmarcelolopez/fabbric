# 04 — Banner intermedio del home configurable

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
