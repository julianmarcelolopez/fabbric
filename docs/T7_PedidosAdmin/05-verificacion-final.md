# Tarea 5 — Definition of Done de T7

**Estado:** ✅ Hecha (2026-07-10)
**Depende de:** tareas 1 a 4

## Objetivo

Cerrar la Fase 7 con el criterio del plan: *cambio de estado dispara email y se refleja en "Mis pedidos" con tracking* + alta manual mixta con clasificación correcta.

## Checklist final (usuario, en navegador)

Con los pedidos reales de T6 (#1 y #2, ambos `paid`):

- [x] `/admin/orders`: pedidos #1/#2 con "Pagado", tipo "Catálogo", cliente Patricia (captura)
- [x] Ciclo del #2: Preparar → Marcar enviado (tracking `AR123456789` exigido por la UI) — emails intentados en cada paso (verificado por logs: 2 llamadas a Resend, 403 esperado por el modo test, sin romper el flujo)
- [x] Portal del comprador: #2 "Enviado" **con tracking visible** (captura — criterio de la fase ✅)
- [x] Pedido manual #3 (solo catálogo, canal local, sin cliente): cobrado → enviado con tracking; movimiento `venta local -1 "venta manual #3"` verificado por DB
- [x] **Pedido manual #4 MIXTO** (catálogo local + bespoke con imagen de referencia, cliente Patricia): badge "Mixto" + "Pagado", thumbnail visible (captura); **solo el ítem de catálogo movió stock** (`venta local -1 "venta manual #4"`, 20→19; el bespoke no tocó inventario) — verificado por DB
- [x] Estados terminales sin botones (captura del "Marcar entregado" como única acción restante en shipped)
- [x] Consola limpia (usuario); suites 2 (21/21) y 3 (11/11) en verde; typecheck limpio

## Al cerrar

- Actualizar README + memoria; ofrecer commit
- Siguiente: **T8 — Clientes (Admin)** (`docs/T8_ClientesAdmin/`)
