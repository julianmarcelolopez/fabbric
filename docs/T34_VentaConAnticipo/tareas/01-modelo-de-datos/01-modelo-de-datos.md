# Tarea 1 — Modelo de datos y schemas compartidos

**Estado:** ⬜ Pendiente.

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

## Criterio de aceptación

`npx tsc --noEmit` limpio en los 3 workspaces. A esta altura no hay lógica
nueva, así que cualquier error acá es de sintaxis/tipos, no de negocio —
vale la pena resolverlo del todo antes de pasar a la Tarea 2.

## Dependencias

- **La bloquean:** ninguna.
- **Bloquea:** todas las demás tareas de T34.
