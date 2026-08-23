# Tarea 1 — Migración: columna `barcode` en `productVariants`

**Estado:** ✅ Hecha (2026-08-17) — migración `0019_modern_praxagora.sql`, verificación 6/6 PASS
**Depende de:** Fase 0 (gaps previos)

## Objetivo

Agregar el campo que permite buscar una variante por el código de barras escaneado — es la única migración de schema que necesita esta app, ninguna tabla nueva.

## Pasos

- [x] En `backend/src/db/schema.ts`, agregar a `productVariants`: `barcode: text("barcode")` (nullable — las variantes ya existentes no tienen código y no deben romper nada).
- [x] Agregar constraint de unicidad **por organización**, no global: `unique("product_variants_org_barcode_unique").on(t.orgId, t.barcode)` (mismo patrón que la unique existente de `talle`/`color`). Postgres no choca dos `NULL` en una unique constraint, así que las variantes sin `barcode` conviven sin problema.
- [x] Generar la migración: `npm run db:generate` (desde `backend/`, **nunca** `db:push`) → `supabase/migrations/0019_modern_praxagora.sql`.
- [x] Revisar el SQL generado: `ALTER TABLE ... ADD COLUMN "barcode" text` + `ADD CONSTRAINT ... UNIQUE("org_id","barcode")` — exactamente lo esperado.
- [x] Aplicar: `npm run db:migrate` (conexión directa, no el pooler) — aplicada sin errores.

## Definition of Done

- [x] La migración corre limpia sobre la base con datos existentes (no es `NOT NULL`, no rompe filas actuales).
- [x] Insertar dos variantes de **distinta** organización con el mismo `barcode` funciona sin conflicto (aislamiento por org).
- [x] Insertar dos variantes de la **misma** organización con el mismo `barcode` falla con violación de constraint (`product_variants_org_barcode_unique`).
- [x] Dos variantes con `barcode` NULL en la misma organización: permitido (Postgres no choca NULLs).
- [x] `tsc --noEmit` limpio tras el cambio de tipo en `schema.ts`.
- [x] Verificado con `backend/t23-01-barcode-migration.mjs` (6/6 PASS), datos de prueba limpiados al final.

## Dependencias

- **La bloquean**: Fase 0 — ya resuelta.
- **Bloquea**: Tarea 2 (`02-endpoint-by-barcode`) — necesita esta columna para poder buscar.
