# Tarea 4 — `OrdersPage` y `OrderNewPage` (admin)

**Estado:** 🔶 Implementada (2026-07-10) — verificación en navegador en la tarea 5
**Depende de:** [02-endpoints-pedidos.md](02-endpoints-pedidos.md), [03-alta-manual.md](03-alta-manual.md)

## Objetivo

La pantalla de trabajo diaria del vendedor: ver ventas, avanzar estados, cargar ventas manuales.

## Pasos

- [x] Entrada "Pedidos" en el sidebar; rutas `/admin/orders`, `/admin/orders/new`, `/admin/orders/:id`
- [x] `OrdersPage.tsx`: tabla con badges de estado/tipo + filtros (estado, tipo, desde/hasta) + "Nuevo pedido"
- [x] `OrderAdminDetailPage.tsx` (página): cliente/nota/pago MP, items con canal + costos + thumbnail clickeable de la imagen bespoke, y **acciones derivadas de `allowedTransitions`** (el server manda las opciones): Marcar cobrado (pending), Preparar, Marcar enviado (exige tracking), Marcar entregado, Cancelar con confirm; estados terminales sin botones
- [x] `OrderNewPage.tsx`: cliente ("sin cliente" incluido — endpoint mínimo `GET /admin/customers` creado, T8 lo extiende), envío opcional (con "gratis desde" en vivo), constructor de ítems catálogo (producto→variante con stock visible por canal + qty + canal) y bespoke (nombre/precio/costo/imagen con upload), lista editable con total → crear → navega al detalle

## Definition of Done

- [x] Typecheck limpio; Vite compila y sirve las 3 páginas
- [ ] Verificación en navegador → tarea 5
