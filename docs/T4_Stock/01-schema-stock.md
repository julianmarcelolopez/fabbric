# Tarea 1 — Tablas `stock_movements` + `catalog_configs` + schemas Zod

**Estado:** ✅ Hecha (2026-07-08) — 9/9 PASS
**Depende de:** —

## Objetivo

El modelo de datos de la fase: el historial de movimientos y la tabla de configuración de tienda (que T4 usa solo para el umbral de stock crítico; T5 la completa).

## Pasos

### Drizzle (`backend/src/db/schema.ts`)

- [x] Enums: `stock_channel` (`online`|`local`), `stock_movement_type` (`entrada`|`venta`|`ajuste`|`sync`)
- [x] `stock_movements` — inmutable (sin `updatedAt`), FK a variante con cascade, convención de signos documentada en el código
- [x] `catalog_configs` — modelo completo del plan; `orgId` unique, `slug` unique **global**
- [x] Migración `0002_stock_y_catalog_config.sql` revisada y aplicada

### Schemas Zod (`packages/shared/src/schemas/`)

- [x] `stockMovement.ts`: enums + entidad + `createStockMovementSchema` (sin `sync`; `superRefine` para signos: entrada > 0, venta < 0, delta ≠ 0)
- [x] `catalogConfig.ts`: entidad + `updateLowStockThresholdSchema`
- [x] Re-export en `index.ts`

## Definition of Done

- [x] Migración versionada y aplicada (3 migraciones registradas en drizzle); tablas + enums verificados
- [x] Con inserts reales: cascade variante→movimientos, unique `orgId`, unique global de `slug` (probado entre dos orgs) — todos 23505 como corresponde
- [x] `tsc --noEmit` limpio en los tres workspaces

## Notas de ejecución (2026-07-08)

- La config de `demo` quedó creada con defaults (slug `demo`, umbral 3) — coincide con lo que el lazy-create de la tarea 2 habría generado, así que se deja.
