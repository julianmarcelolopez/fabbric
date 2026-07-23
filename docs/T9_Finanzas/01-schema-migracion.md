# Tarea 1 — Schema: `wallets` + `financial_movements` (migración 0005)

**Estado:** ✅ Completada (2026-07-12)
**Depende de:** —

## Objetivo

Las dos tablas del módulo financiero, con sus schemas Zod en shared (el plan ya los lista: `wallet.ts`, `financialMovement.ts`).

## Pasos

`packages/shared/src/schemas/`:

- [ ] `wallet.ts`: `walletSchema`, `createWalletSchema` (name requerido, icon/color opcionales, initialBalance en centavos ≥ 0 default 0), `updateWalletSchema` (name/icon/color/active — **sin** initialBalance)
- [ ] `financialMovement.ts`: `movementTypeSchema` (`income`/`expense`), `createMovementSchema` (walletId, type, amount > 0 en centavos, category?, description?, date? `YYYY-MM-DD` default hoy AR), y las **listas de categorías sugeridas** de bordart como consts (`SUGGESTED_INCOME_CATEGORIES` / `SUGGESTED_EXPENSE_CATEGORIES`) para la UI

`backend/src/db/schema.ts`:

- [ ] `wallets`: `id`, `orgId` (FK), `name`, `icon?`, `color?`, `initialBalance` (int, centavos, default 0), `active` (default true), timestamps. Unique `(orgId, name)`
- [ ] `financial_movements`: `id`, `orgId` (FK), `walletId` (FK a wallets, **sin** cascade — una cartera con movimientos no se borra y no hay DELETE de carteras), `type` (`income`/`expense`), `amount` (int > 0; el signo lo da `type`), `category?`, `description?`, `date` (tipo `date`, no timestamp — fecha contable), `orderId?` (FK a orders, nullable — el vínculo que bloquea el borrado), `createdAt`. Índice por `(orgId, date)` (el reporte mensual filtra por rango de fechas)

Migración:

- [ ] `npm run db:generate` → revisar el SQL → `npm run db:migrate` → queda versionada como `supabase/migrations/0005_finanzas.sql` (renombrar si drizzle-kit genera otro nombre, como siempre)

## Definition of Done

- [x] Migración aplicada contra Supabase y versionada en `supabase/migrations/0005_finanzas.sql`
- [x] `tsc --noEmit` limpio en backend y shared (frontend también)

## Notas de ejecución (2026-07-12)

- Todos los pasos según lo planificado: `wallet.ts` + `financialMovement.ts` en shared (con `SUGGESTED_INCOME_CATEGORIES`/`SUGGESTED_EXPENSE_CATEGORIES` de bordart), tablas + enum `movement_type` en `schema.ts`, migración generada con `npm run db:generate -- --name finanzas` (el `--name` evita el renombrado manual de siempre).
- Verificado contra Supabase: tablas creadas, enum OK, las 3 FKs de `financial_movements` sin cascade (no action), unique `(org_id, name)` en wallets, índice `(org_id, date)`.
- **Gotcha nuevo (importante)**: `DIRECT_URL` (`db.<ref>.supabase.co:5432`) es **solo IPv6** y el contenedor Docker no tiene salida IPv6 → `db:migrate` colgaba sin mensaje de error. Solución para correr migraciones desde el contenedor: usar el **session pooler** (mismo host del pooler pero puerto **5432**, modo sesión — válido para DDL/migraciones): `DIRECT_URL=$(echo "$DATABASE_URL" | sed "s/:6543/:5432/") npm run db:migrate`. Desde el host con IPv6 la URL original funciona.
