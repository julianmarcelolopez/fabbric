# Tarea 1 — Migración: tabla `invoices`

**Estado:** ✅ Hecha (2026-09-03) — migración `0021_sticky_wind_dancer.sql`

**Depende de:** Fase 1 (config AFIP por organización)

## Objetivo

Modelar el comprobante emitido (o intentado) por una venta local, como una tabla nueva vinculada 1 a 1 con `orders`.

## Pasos

- [x] En `backend/src/db/schema.ts`, tabla nueva `invoices`: `id`, `orgId`, `orderId` (FK a `orders`, único), `tipo` (text, `"C"` fijo por ahora), `numero`/`cae`/`caeVencimiento` (nullable — `caeVencimiento` como `text`, no `date`: el SDK ya lo devuelve como string `AAAA-MM-DD`, no hace falta parsearlo), `estado` (`pgEnum` nuevo `invoice_estado`: `pendiente`/`emitida`/`error`), `clienteNombre`/`clienteEmail`/`clienteDni`, `mensajeError`, timestamps. Índice por `orgId`.
- [x] Constraint de unicidad en `orderId` (`invoices_order_id_unique`).
- [x] Migración generada y aplicada: `supabase/migrations/0021_sticky_wind_dancer.sql` — 1 enum + 1 tabla nueva, sin tocar `orders` ni ninguna tabla existente.

## Definition of Done

- [x] La tabla se crea limpia, sin afectar `orders` existentes.
- [x] Constraint de unicidad en `orderId` en la migración (verificación funcional del conflicto queda para la Tarea 2, cuando se inserta la primera fila real).
- [x] `tsc --noEmit` limpio.

## Dependencias

- **La bloquean**: Fase 1 — ya resuelta.
- **Bloquea**: Tarea 2 (`02-extender-venta-local`) — ya puede insertar la fila `pendiente`. **Desbloqueada.**
