# Tarea 5 — Definition of Done de T7

**Estado:** ⬜ Pendiente
**Depende de:** tareas 1 a 4

## Objetivo

Cerrar la Fase 7 con el criterio del plan: *cambio de estado dispara email y se refleja en "Mis pedidos" con tracking* + alta manual mixta con clasificación correcta.

## Checklist final (usuario, en navegador)

Con los pedidos reales de T6 (#1 y #2, ambos `paid`):

- [ ] `/admin/orders`: los 2 pedidos listados con estado "Pagado", tipo "Catálogo", cliente Patricia
- [ ] Avanzar el #1: **Preparar** → **Enviar** (cargar un tracking, ej. `AR123456789`) → el comprador recibe **email** (o el log si no hay Resend) en cada paso
- [ ] En la ventana del comprador: "Mis pedidos" muestra el #1 "Enviado" **con el tracking visible**
- [ ] **Entregar** el #1 → estado final; intentar "Preparar" de nuevo → los botones ya no lo ofrecen (transición inválida)
- [ ] **Nuevo pedido manual**: cliente "sin cliente", 1 ítem de catálogo (canal local) + 1 ítem bespoke con imagen de referencia → aparece como "Mixto" y `pending`
- [ ] **Marcar cobrado** el manual → `paid`; el stock **local** del ítem de catálogo bajó (verificar en `/admin/stock`, movimiento `venta`); el bespoke no tocó stock
- [ ] Cancelar un pedido pending de prueba → `cancelled`, terminal
- [ ] Consola limpia; verificación mía: suites 2-3 en verde, typecheck

## Al cerrar

- Actualizar README + memoria; ofrecer commit
- Siguiente: **T8 — Clientes (Admin)** (`docs/T8_ClientesAdmin/`)
