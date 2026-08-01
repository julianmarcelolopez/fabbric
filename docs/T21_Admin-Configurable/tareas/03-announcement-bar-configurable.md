# 03 — Announcement bar configurable

## Qué se implementa

Un campo de texto opcional para que cada tienda escriba su propio mensaje de announcement bar, en vez de depender exclusivamente del texto autogenerado desde zonas de envío.

## Por qué existe (referencia a T20/08)

Fila "Texto del announcement bar" de la tabla de `docs/T20_UX-Store/tareas/08-admin-configurable.md`: en T20/02, sin campo de texto libre, se resolvió autogenerando el mensaje desde la zona de envío gratis más accesible (`StoreLayout.tsx`). Documentado ahí mismo: *"el usuario pidió hacer configurable el texto del announcement bar; se le explicó que requiere un campo nuevo en `catalog_configs` y decidió dejarlo para más adelante"*. Esta tarea es ese "más adelante".

## Cambios de backend requeridos

- **Schema** (`backend/src/db/schema.ts`): `announcementText: text("announcement_text")` (nullable) en `catalogConfigs`.
- **Migración**: Drizzle, columna nullable, sin backfill.
- **Endpoint**: `announcementText` se suma al schema Zod de `updateCatalogConfigSchema` (paquete `@fabbric/shared`) — se actualiza por el mismo `PATCH /admin/catalog-config` que ya existe, sin endpoint nuevo.
- **Endpoint público**: sumar `announcementText` al select de `GET /public/:slug/config` en `backend/src/modules/public/routes.ts`.

## Cambios de frontend requeridos

**Admin** (`frontend/src/features/admin/pages/MyStorePage.tsx`):
- Campo de texto (input o textarea corto, evaluar límite de caracteres razonable para que no rompa el layout del announcement bar) con placeholder *"Se genera automáticamente desde tus zonas de envío si lo dejás vacío"*.

**Tienda pública** (`frontend/src/features/store/StoreLayout.tsx`):
- Si `config.announcementText` existe y no está vacío, usarlo tal cual.
- Si no, mantener el comportamiento actual (autogenerado desde `cheapestFreeShipping`) — el fallback de T20/02 no se elimina, solo pasa a ser el default cuando no hay texto propio.
- Si no hay texto propio NI zona de envío gratis configurada, la barra sigue sin mostrarse (mismo comportamiento de hoy).

## Archivos a modificar

- `backend/src/db/schema.ts`
- `supabase/migrations/` (nueva migración)
- `packages/shared/src/schemas/` (sumar el campo a `updateCatalogConfigSchema` y al tipo de config)
- `backend/src/modules/public/routes.ts`
- `frontend/src/features/admin/pages/MyStorePage.tsx`
- `frontend/src/features/store/StoreLayout.tsx`
- `frontend/src/features/store/types.ts` (`PublicStoreConfig`)

## Criterio de completado

- Escribir un texto en el admin y verlo reflejado tal cual en el announcement bar de la tienda real.
- Vaciar el campo y confirmar que vuelve a autogenerarse desde las zonas de envío (no queda una barra vacía ni rota).
- `tsc --noEmit` limpio; verificado en navegador con ambos casos (con texto propio y sin él).

## Notas y dependencias

- Independiente de `01`, `02`, `04`, `05`, `06`, `07`.
- Es el patrón más simple de las 7 tareas de T21: un campo de texto en una tabla que ya existe, sin storage, sin lógica nueva más allá de "si existe, usalo".
