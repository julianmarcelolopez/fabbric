# 06 — Política de cambios/devoluciones

## Qué se implementa

Un campo de texto largo opcional para que cada tienda describa su propia política de cambios/devoluciones, mostrado en la ficha de producto en vez del link genérico a WhatsApp que dejó T20.

## Por qué existe (referencia a T20/08)

Fila "Política de cambios/devoluciones" de la tabla de `docs/T20_UX-Store/tareas/08-admin-configurable.md`: en T20/06, el mockup mostraba un beneficio "Cambios gratis · 30 días" — se identificó como una promesa de política inventada, sin dato real detrás, y se reemplazó por un link a WhatsApp ("Para cambios o consultas, escribinos") tanto en el benefits strip como en el panel "Envíos y cambios" del accordion. Esta tarea le da a cada tienda la opción de escribir su política real en vez de derivar todo a un mensaje de contacto.

## Cambios de backend requeridos

- **Schema** (`backend/src/db/schema.ts`): `returnPolicy: text("return_policy")` (nullable) en `catalogConfigs`.
- **Migración**: Drizzle, columna nullable, sin backfill.
- **Endpoint**: `returnPolicy` se suma a `updateCatalogConfigSchema` (`@fabbric/shared`) — se actualiza por el `PATCH /admin/catalog-config` existente.
- **Endpoint público**: sumar `returnPolicy` al select de `GET /public/:slug/config`.

## Cambios de frontend requeridos

**Admin** (`frontend/src/features/admin/pages/MyStorePage.tsx`):
- Textarea con placeholder *"Ej: Cambios dentro de los 30 días con ticket de compra"*, dejando claro que es texto libre de la tienda, no una validación estructurada de fabbric.

**Tienda pública** (`frontend/src/features/catalog/ProductDetailView.tsx`, ya recibe `whatsappHref`/`address`/`businessHours` como props opcionales desde T20/06 — sumar `returnPolicy` al mismo patrón):
- Panel "Envíos y cambios" del accordion: si `returnPolicy` existe, mostrarlo como párrafo propio dentro del panel (además de lo que ya hay: resumen de envío, dirección, horario).
- Benefit strip: si `returnPolicy` existe, el tercer beneficio pasa de "Consultas por WhatsApp" a algo como "Cambios y devoluciones" apuntando a un ancla dentro del accordion (o se deja el link a WhatsApp igual y el texto real solo aparece en el accordion — a decidir en la implementación, evaluando qué se ve mejor sin duplicar información).
- Si `returnPolicy` NO existe: se mantiene exactamente el comportamiento de hoy (link a WhatsApp) — el fallback de T20/06 no se elimina.

## Archivos a modificar

- `backend/src/db/schema.ts`
- `supabase/migrations/` (nueva migración)
- `packages/shared/src/schemas/` (sumar el campo a `updateCatalogConfigSchema`)
- `backend/src/modules/public/routes.ts`
- `frontend/src/features/admin/pages/MyStorePage.tsx`
- `frontend/src/features/catalog/ProductDetailView.tsx`
- `frontend/src/features/store/pages/StoreProductPage.tsx` (pasar la nueva prop)
- `frontend/src/features/store/types.ts` (`PublicStoreConfig`)

## Criterio de completado

- Cargar una política de cambios desde el admin y verla reflejada en la ficha de producto real.
- Sin ese campo cargado, la ficha de producto se sigue viendo exactamente como la dejó T20/06 (link a WhatsApp, sin panel roto ni vacío).
- `tsc --noEmit` limpio; verificado en navegador con y sin el campo cargado.

## Notas y dependencias

- Independiente de `01`, `02`, `03`, `04`, `05`, `07`.
- Mismo patrón que `03` y `04` — campo de texto simple en `catalog_configs`, sin storage, sin lógica nueva más allá de "si existe, mostralo; si no, fallback".
