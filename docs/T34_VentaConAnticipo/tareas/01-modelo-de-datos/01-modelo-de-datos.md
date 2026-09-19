# Tarea 1 — Modelo de datos y schemas compartidos

**Estado:** ✅ Hecha (2026-09-18).

**Depende de:** nada.

## Objetivo (según `plan.md`, T34/Fase 1)

Base para todo lo demás — migración + schemas de Zod + tipos del admin.
Sin lógica de negocio todavía, solo el terreno para que el resto del plan
tenga dónde pararse.

## Alcance

- Migración Drizzle (`npm run db:generate` desde `backend/`, próximo
  número `0027_*`):
  - `orderStatus` (`backend/src/db/schema.ts:22-29`) suma `"partial"`
    entre `"pending"` y `"paid"`.
  - `orders` (`backend/src/db/schema.ts:313-348`) suma columna
    `balanceDueDate: date("balance_due_date")` (nullable, mismo helper
    `date(...)` que ya usa `financialMovements.date` línea 425).
  - `customers` (`backend/src/db/schema.ts:273-293`): `googleSub` y
    `email` pasan de `.notNull()` a nullable (necesario para la Tarea 2).
- `packages/shared/src/schemas/order.ts`:
  - `orderStatusSchema` (línea 3-10) suma `"partial"`.
  - `ORDER_TRANSITIONS` (línea 73-80) suma `partial: ["cancelled"]` —
    sin entrada que apunte a `partial` como destino desde otro estado
    (mismo criterio que `paid`: se llega solo por un endpoint específico).
  - `ventaLocalMedioPagoSchema` nuevo: `medioPagoSchema.or(z.literal("anticipo"))`
    — **no** ensanchar `medioPagoSchema`/`MedioPago` en sí (ver
    `plan.md`, Hallazgo 1 — rompería `LOCAL_SALE_WALLETS` y
    `MEDIO_LABELS`, dos `Record<MedioPago,...>` exhaustivos).
  - `ventaLocalSchema` (línea 161-165): `medioPago` pasa a
    `ventaLocalMedioPagoSchema`; suma `montoPagado`, `customerId`,
    `balanceDueDate` (opcionales) + el `.refine(...)` de `analisis.md`.
  - `cobrarSaldoSchema` nuevo: `{ monto: z.number().int().min(1), medioPago: medioPagoSchema }`
    (reusa `medioPagoSchema` sin ensanchar — "anticipo" no es una opción
    acá).
- `frontend/src/features/admin/types.ts` (tipos **locales**, no vienen de
  `@fabbric/shared` — fácil de saltear si no se busca a propósito):
  - `AdminOrderStatus` (línea 167) suma `"partial"`.
  - `ADMIN_ORDER_STATUS` (línea 170-177) suma `partial: { label: "Saldo pendiente", color: "#b45309" }`.
  - `AdminOrderDetail` (línea 224-245) suma `balanceDueDate: string | null`,
    `pagado: number`, `saldoPendiente: number`.

## Resultado real

Implementado tal cual el alcance. Dos gaps encontrados recién al correr
`tsc` (no estaban anticipados en `plan.md`, típico de ensanchar un tipo
nullable):
- `backend/src/modules/portal/routes.ts:62` — `publicProfile(row)` esperaba
  `email: string`; `row.email` ahora es `string | null` tras la migración.
  Arreglado con una aserción explicada (esta ruta solo la alcanza un
  customer ya autenticado por Google vía `requireCustomerAuth`, nunca un
  walk-in — mismo razonamiento que `auth.ts`).
- `packages/shared/src/schemas/customer.ts` (`customerSchema`) declaraba
  `googleSub`/`email` no-nulos — desactualizado contra el schema real, y
  además **no lo importa nadie** en todo el repo (confirmado por grep) —
  se corrigió igual por prolijidad, sin romper nada al ser código muerto.
- `frontend/src/features/admin/types.ts` — de paso se ensancharon
  `AdminCustomerRow.email` y `AdminCustomerDetail.email` a `string | null`
  (no estaban en el alcance original del plan, pero son el mismo tipo de
  gap) — verificado que `CustomersPage.tsx`/`CustomerDetailPage.tsx` ya
  renderizan `null` sin problema (JSX plano, sin `.toLowerCase()` ni nada
  que asuma no-nulo).

Migración `0027_t34_venta_anticipo.sql` generada y **aplicada contra la
base real** (vía el workaround ya documentado en la memoria del proyecto:
`DIRECT_URL` es IPv6-only desde Docker, se usó el pooler de sesión en
puerto 5432 en su lugar, sin tocar `.env.local`). Verificado con un script
`.mjs` descartable contra la DB real (borrado después): el enum trae
`partial`, `orders.balance_due_date` es `date` nullable, y
`customers.google_sub`/`email` ya son nullable.

## Criterio de aceptación

✅ `npx tsc --noEmit` limpio en los 3 workspaces (con la única excepción
esperada: `orders/routes.ts:470`, `LOCAL_SALE_WALLETS[medioPago]` — es
justo lo que resuelve la Tarea 3, no un error de esta tarea).

## Dependencias

- **La bloquean:** ninguna.
- **Bloquea:** todas las demás tareas de T34.
