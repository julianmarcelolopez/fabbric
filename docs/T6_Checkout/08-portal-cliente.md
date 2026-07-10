# Tarea 8 — Portal del comprador: "Mis pedidos" + detalle

**Estado:** ✅ Hecha (2026-07-09) — suite 11/11 PASS (verificación visual junto con la E2E de la tarea 9)
**Depende de:** [04-customer-auth.md](04-customer-auth.md), [07-webhook-mp.md](07-webhook-mp.md)

## Objetivo

Que el comprador vea sus pedidos y su estado dentro de la tienda — cierra el loop del criterio de la fase ("orden en Mis pedidos").

## Pasos

- [x] `GET /portal/:slug/orders` — número, fecha, estado, total, itemCount; descendente
- [x] `GET /portal/:slug/orders/:id` — items con snapshot, envío, totales, tracking, nota — solo del dueño (404 si no); sin datos internos (verificado por ausencia: costSnapshot/orgId/mpPreferenceId)
- [x] `MyOrdersPage` + `OrderDetailPage` en `/store/:slug/portal/orders(/:id)`: badges de estado con color, aviso "esperando confirmación" en pending, link "Mis pedidos" en el menú del usuario de la topbar
- [x] Sin login → CTA de Google

## Definition of Done

- [x] Suite 11/11 con dos compradores: A ve SUS 2 órdenes (paid por webhook + pending) en orden; el pedido de B no aparece y su detalle → 404; sin token → 401
- [ ] En navegador: tras el pago de la E2E el pedido aparece `paid` — tarea 9
- [x] Rutas en `/docs`; `tsc --noEmit` limpio en backend y frontend
