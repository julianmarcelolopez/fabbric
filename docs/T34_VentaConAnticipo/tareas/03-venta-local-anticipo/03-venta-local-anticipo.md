# Tarea 3 — Backend: `venta-local` con anticipo

**Estado:** ✅ Hecha (2026-09-18).

**Depende de:** Tarea 2.

## Objetivo (según `plan.md`, T34/Fase 3)

Extender `POST /admin/orders/venta-local` para que soporte el caso de
anticipo, sin tocar el comportamiento actual para el resto de los medios
de pago.

## Alcance

`backend/src/modules/orders/routes.ts:419-...` (handler completo — insert
de la orden en la línea ~498-507, cálculo de `wallet` en la línea 470,
`recordOrderCharge` en la línea 525):

- El descuento de stock (líneas 479-492) **no se toca** — ya es
  incondicional, resuelve la decisión 3 de `analisis.md` sin cambios.
- `const wallet = LOCAL_SALE_WALLETS[medioPago]` (línea 470) pasa a
  condicional: `medioPago === "anticipo" ? LOCAL_SALE_WALLETS.efectivo :
  LOCAL_SALE_WALLETS[medioPago]` (ver `plan.md`, "Cartera del anticipo" —
  sin selector en esta versión, hardcodeado a Efectivo).
- El insert de la orden (hoy `status: "paid"` fijo) pasa a:
  - `medioPago !== "anticipo"` → igual que hoy.
  - `medioPago === "anticipo"` → `status: "partial"`, `customerId:
    body.customerId`, `balanceDueDate: body.balanceDueDate`.
- `recordOrderCharge` (línea 525-531, hoy siempre `amount: order.total`)
  pasa a `amount: medioPago === "anticipo" ? body.montoPagado :
  order.total` — sigue siendo el único movimiento del pedido en este
  punto (el problema de idempotencia de `recordOrderCharge` con múltiples
  cobros es de la Tarea 4, no de acá).

## Criterio de aceptación

✅ Cumplido. Implementado tal cual el alcance — destructuring de
`montoPagado`/`customerId`/`balanceDueDate` del body, `wallet` condicional
(`esAnticipo ? LOCAL_SALE_WALLETS.efectivo : LOCAL_SALE_WALLETS[medioPago]`),
insert de la orden condicional, `recordOrderCharge` con `amount:
esAnticipo ? montoPagado! : order.total`.

Verificado con script `.mjs` descartable (org/producto/variante/cliente
temporales, borrados al final): 12/12 checks OK — venta normal sin
regresión (sigue naciendo `paid`), anticipo nace `partial` con `total` =
precio completo (no el monto pagado), `customerId`/`balanceDueDate`
guardados, un único movimiento financiero por `montoPagado` (4000 de
10000) en la cartera Efectivo, anticipo sin los 3 campos rechaza con 400
(el `.refine()` de `ventaLocalSchema` funciona), y el stock se descuenta
igual en los dos casos.

## Dependencias

- **La bloquean:** Tarea 2.
- **Bloquea:** Tarea 4, Tarea 5.
