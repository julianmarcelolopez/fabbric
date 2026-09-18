# Tarea 4 — Backend: `cobrar-saldo` + detalle de pedido

**Estado:** ⬜ Pendiente.

**Depende de:** Tarea 3.

## Objetivo (según `plan.md`, T34/Fase 4)

El endpoint que usan **los dos** clientes (PWA y admin, decisión 1 de
`analisis.md`) para registrar un cobro sobre el saldo pendiente de un
pedido `partial`, más la información que necesita el admin para mostrar
ese saldo.

## Alcance

- `POST /admin/orders/:id/cobrar-saldo`
  (`backend/src/modules/orders/routes.ts`, junto al resto de los
  `app.post` de pedidos):
  - Valida: pedido existe y es de la `orgId` del request (`requireOrgId`,
    mismo patrón que el resto del archivo); `status === "partial"`.
  - `pagadoHastaAhora = sum(financialMovements.amount WHERE orderId = :id)`.
  - Si `pagadoHastaAhora + monto > order.total` → 400 `overpayment`.
  - **Inserta el movimiento directo** (`tx.insert(financialMovements).values(...)`)
    — **no** reusar `recordOrderCharge` (`finance/service.ts:139-170`):
    es idempotente POR PEDIDO (si ya existe cualquier `income` para ese
    `orderId`, no hace nada), lo que se comería en silencio el segundo
    cobro de un mismo pedido. Ver `plan.md`, Hallazgo 2, para el detalle
    completo — esto es plata real, no un detalle cosmético.
  - Si `pagadoHastaAhora + monto >= order.total` → `orders.status = "paid"`.
  - Devuelve el pedido actualizado + `saldoPendiente`.
- `GET /admin/orders/:id` (`backend/src/modules/orders/routes.ts:150-200`)
  — hoy no trae movimientos financieros en absoluto. Sumar al
  `select`/response: `pagado` (suma de `financialMovements.amount WHERE
  orderId = :id AND type = 'income'`) y `saldoPendiente` (`order.total -
  pagado`) — los necesita la Tarea 7 (`OrderAdminDetailPage.tsx`).

## Criterio de aceptación

`npx tsc --noEmit` + `curl`: cobrar de a partes hasta completar el total
confirma que el pedido pasa a `paid` solo, sin acción manual extra;
intentar cobrar de más devuelve 400 sin dejar movimientos a medias (mismo
pedido probado dos veces: un cobro parcial válido, y uno que se pasa).
Confirmar explícitamente que un **segundo** cobro sobre el mismo pedido sí
inserta un movimiento nuevo (no lo pisa el guard de idempotencia que tiene
`recordOrderCharge`).

## Dependencias

- **La bloquean:** Tarea 3.
- **Bloquea:** Tarea 6, Tarea 7 (ambas ramas, PWA y Admin, arrancan recién
  con esto listo).
