# 06 — Política de cambios/devoluciones

**Estado:** ✅ Completa (2026-08-01)

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

## Resultado

**Decisión del usuario**: el benefit strip **no cambia** — sigue linkeando a WhatsApp exista o no `returnPolicy`. La política real aparece únicamente dentro del panel "Envíos y cambios" del accordion, como párrafo propio **antes** del resumen de envío/dirección/horario. Sin anclas, sin duplicar información entre el strip y el accordion.

**Backend**: `returnPolicy` (nullable, máx 2000 — mismo límite que `businessDescription`) en `catalogConfigs`, migración `0014_return_policy.sql` aplicada. Sumado a `catalogConfigSchema`/`updateCatalogConfigSchema` y a `GET /public/:slug/config`.

**Frontend admin** (`MyStorePage.tsx`): textarea nueva junto al campo de announcement bar (misma sección de identidad/textos configurables), con el placeholder exacto que pidió el usuario.

**Frontend tienda pública**: `ProductDetailView.tsx` ganó la prop opcional `returnPolicy` (mismo patrón que `whatsappHref`/`shippingSummary`/`address`/`businessHours` desde T20/06 — el preview del admin no la pasa, esa sección simplemente no cambia ahí). La condición para mostrar el panel "Envíos y cambios" ahora incluye `returnPolicy` (antes el panel no aparecía si SOLO había política sin ningún otro dato). `StoreProductPage.tsx` pasa `config.returnPolicy`.

**Verificación real de datos** (`backend/t21-06-return-policy.mjs`, queda en el repo sin trackear): admin *staff* temporal, confirmado que `returnPolicy` es `null` en el estado real de Eliathi Modas, que setearlo se refleja sin delay en `GET /public/eliathi-modas/config`, que vaciarlo vuelve a `null` (dispara el fallback a WhatsApp en el frontend), y que el límite de 2000 caracteres se respeta (2001 → 400). 8/8 checks en verde.

`tsc --noEmit` limpio en `backend/` y `frontend/`; `vite build` limpio. **Pendiente**: verificación visual del usuario — cargar una política real y confirmarla en una ficha de producto, y confirmar que sin el campo la ficha se ve exactamente como la dejó T20/06.

Con esta tarea, **T21 — Lo que T20 dejó pendiente del lado del backend queda completo** (`01` a `07`, todas con Resultado documentado).
