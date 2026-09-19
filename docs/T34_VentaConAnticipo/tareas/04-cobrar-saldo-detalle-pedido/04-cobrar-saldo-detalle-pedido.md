# Tarea 4 — Backend: `cobrar-saldo` + detalle de pedido

**Estado:** ✅ Hecha (2026-09-18).

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

## Resultado real

`pagadoDePedido(orderId)` — helper nuevo, mismo patrón
`coalesce(sum(...),0)::int` que ya usa `finance/service.ts` (no el helper
`sum()` de drizzle-orm, por consistencia con el resto del proyecto — se
probó y se revirtió a propósito). Reusado por `GET /admin/orders/:id`
(ahora devuelve `pagado`/`saldoPendiente`) y por `cobrar-saldo`. El insert
del movimiento + el posible pase a `"paid"` quedaron en su propia
transacción (`db.transaction`) — atomicidad entre las dos escrituras.

## Criterio de aceptación

✅ Cumplido. Verificado con script `.mjs` descartable (14/14 checks OK):
`GET /admin/orders/:id` trae `pagado`/`saldoPendiente` correctos tras el
anticipo inicial; un cobro parcial no completa el pedido; un intento de
`overpayment` devuelve 400 **sin dejar movimientos a medias** (confirmado
contando filas de `financial_movements` antes/después); el cobro que
completa el total pasa a `paid` solo; cobrar sobre un pedido ya `paid`
devuelve 409; **el segundo cobro sí insertó un movimiento nuevo** — prueba
directa de que el fix del guard de idempotencia de `recordOrderCharge`
funciona (con el bug original, ese cobro se habría perdido en silencio).

## Dependencias

- **La bloquean:** Tarea 3.
- **Bloquea:** Tarea 6, Tarea 7 (ambas ramas, PWA y Admin, arrancan recién
  con esto listo).
