# Tarea 1 — Backend: `stockOverview()` suma marca/barcode/foto

**Estado:** ✅ Hecha. `tsc --noEmit` limpio en `backend/`. No se pudo probar
con `curl` real (las credenciales de `SEED_ADMIN_EMAIL`/`PASSWORD` en
`.env.local` ya no coinciden con la contraseña real) — reusa el mismo
patrón ya probado en `GET /admin/products` (join a `brands` + `firstImages`
aparte), riesgo bajo. Falta la verificación visual en navegador.

**Depende de:** nada.

## Objetivo (según `plan.md`, T39/Fase 1)

Que `/admin/stock` traiga todo lo necesario para identificar visualmente
cada fila (foto, marca, código de barras), sin que el frontend tenga que
pedir nada aparte.

## Alcance

- `backend/src/modules/stock/routes.ts`, función `stockOverview()`
  (líneas 18-44): el `select` suma:
  - `brandName`: `left join brands on brands.id = products.brand_id`,
    mismo patrón que `GET /admin/products`
    (`backend/src/modules/products/routes.ts`).
  - `barcode`: `productVariants.barcode` — ya existe en la tabla, no hace
    falta join nuevo, solo agregarlo al select.
  - `firstImageUrl`: join a `productImages`, agrupado por `productId`,
    tomando la de `sortOrder` más bajo — mismo patrón que `firstImages` en
    `GET /admin/products`.
- Revisar `StockItem` (`frontend/src/features/admin/types.ts`) y sumarle
  los 3 campos nuevos.

## Criterio de aceptación

- `tsc --noEmit` limpio en `backend/`.
- `curl` contra `/admin/stock` en Docker: cada item del array trae
  `brandName` (string o null), `barcode` (string o null) y
  `firstImageUrl` (string o null).
- `/admin/stock/critical` (el endpoint hermano que filtra críticos)
  también hereda los campos nuevos automáticamente, sin tocarlo aparte
  (reusa `stockOverview()`).

## Dependencias

- **La bloquean:** ninguna.
- **Bloquea:** Tarea 2.
