# Tarea 2 — Endpoints admin de pedidos (lista, detalle, estados, tracking, cobro manual)

**Estado:** ✅ Hecha (2026-07-10) — suite 21/21 PASS
**Depende de:** [01-email-resend.md](01-email-resend.md)

## Objetivo

La gestión de ventas del admin, con la máquina de estados aplicada en el servidor y el email al comprador como efecto del cambio de estado.

## Pasos

`backend/src/modules/orders/routes.ts` (admin, org-scoped, Swagger):

- [x] `GET /admin/orders` — filtros `status`/`type`/`from`/`to`; filas con cliente, total, estado, tipo derivado, itemCount
- [x] `GET /admin/orders/:id` — detalle completo con `unitCostSnapshot` (es admin) + `allowedTransitions` en la respuesta
- [x] `PATCH /admin/orders/:id/status` — máquina de estados aplicada (`ORDER_TRANSITIONS` de shared); inválida → 409 con las opciones válidas; `shipped` con tracking; email al comprador como efecto
- [x] `POST /admin/orders/:id/mark-paid` — `pending→paid` en transacción + movimientos `venta` por canal del ítem; repetido → 409; nota en el código para el refuerzo de T9
- [x] `ORDER_TRANSITIONS`, `canTransition`, `deriveOrderType` y `updateOrderStatusSchema` en `@fabbric/shared`
- [x] **Cambio no previsto**: columna `channel` en `order_items` (migración `0004`) — el README asumía cero migraciones y estaba equivocado; el checkout setea `online`, los ítems de T6 se backfillearon

## Definition of Done

- [x] Suite 21/21: lista y filtros (tipo `mixto` con orden de prueba), ciclo completo paid→preparing→shipped(tracking)→delivered, inválidas → 409, `pending→paid` por PATCH prohibido, mark-paid descuenta 2 del canal correcto con movimiento `venta manual #N`, **el tracking aparece en el portal del comprador**
- [x] **Aislamiento**: staff de otra org — lista vacía y 404
- [x] Rutas en `/docs`; `tsc --noEmit` limpio; pedidos reales #1/#2 intactos tras la limpieza
