# Tarea 2 — Endpoints admin de pedidos (lista, detalle, estados, tracking, cobro manual)

**Estado:** ⬜ Pendiente
**Depende de:** [01-email-resend.md](01-email-resend.md)

## Objetivo

La gestión de ventas del admin, con la máquina de estados aplicada en el servidor y el email al comprador como efecto del cambio de estado.

## Pasos

`backend/src/modules/orders/routes.ts` (admin, org-scoped, Swagger):

- [ ] `GET /admin/orders` — lista con filtros query: `status?`, `from?`, `to?` (fechas), `type?` (catalogo|personalizado|mixto — calculado); cada fila: número, fecha, cliente (nombre/email o "—" si manual sin cliente), total, estado, tipo derivado, cantidad de ítems
- [ ] `GET /admin/orders/:id` — detalle completo: items (con `unitCostSnapshot` — acá SÍ es admin), envío, cliente, mpPaymentId, nota, tracking, tipo derivado
- [ ] `PATCH /admin/orders/:id/status` — body `{ status, trackingNumber? }`; **transiciones válidas**: `pending→cancelled`, `paid→preparing|cancelled`, `preparing→shipped|cancelled`, `shipped→delivered`; inválida → 409 `invalid_transition` con las opciones válidas en el mensaje. `shipped` acepta/actualiza `trackingNumber`. **Efecto**: email al comprador (si hay) con el estado nuevo.
- [ ] `POST /admin/orders/:id/mark-paid` — `pending → paid` para ventas fuera de MP; por cada ítem de catálogo registra el movimiento `venta` en el canal indicado al crear el ítem (T3 de esta fase); email "pago confirmado". **Nota en el código**: T9 refuerza esto creando el `financial_movement`.
- [ ] Los estados y transiciones viven en `@fabbric/shared` (`orderTransitions`) para que el frontend muestre solo botones válidos

## Definition of Done

- [ ] Suite HTTP: lista con filtros (estado y tipo derivado correctos con órdenes reales de T6 + una manual de prueba); transición válida → 200 + email logueado/enviado; inválida → 409; `mark-paid` descuenta stock del canal correcto con movimiento `venta`; tracking en `shipped` visible después en el portal del comprador
- [ ] **Aislamiento**: staff de otra org → 404/lista vacía
- [ ] Rutas en `/docs`; `tsc --noEmit` limpio
