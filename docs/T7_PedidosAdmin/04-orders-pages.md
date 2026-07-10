# Tarea 4 — `OrdersPage` y `OrderNewPage` (admin)

**Estado:** ⬜ Pendiente
**Depende de:** [02-endpoints-pedidos.md](02-endpoints-pedidos.md), [03-alta-manual.md](03-alta-manual.md)

## Objetivo

La pantalla de trabajo diaria del vendedor: ver ventas, avanzar estados, cargar ventas manuales.

## Pasos

- [ ] Entrada "Pedidos" en el sidebar, rutas `/admin/orders` y `/admin/orders/new`
- [ ] `OrdersPage.tsx`: tabla (número, fecha, cliente, tipo con badge, total, estado con badge de color) + filtros (estado, tipo, rango de fechas) + botón "Nuevo pedido"
- [ ] Detalle (drawer o página): items con talle/color e imagen de referencia si es bespoke, costos (visibles solo acá — es admin), envío, nota, tracking editable, **botones de acción según transiciones válidas** (de `orderTransitions` compartido): "Marcar cobrado" (pending), "Preparar", "Enviar" (pide tracking), "Entregar", "Cancelar" con confirm
- [ ] `OrderNewPage.tsx`: selector de cliente (buscador simple o "sin cliente"), agregado de ítems de catálogo (selector producto→variante + qty + canal) y bespoke (nombre, precio, costo, qty, imagen opcional con upload), zona de envío opcional, nota → crear → navega al detalle

## Definition of Done

- [ ] Typecheck limpio; Vite compila
- [ ] Verificación en navegador (junto con la tarea 5): flujo completo de gestión sobre los pedidos reales de T6 + una venta manual mixta
