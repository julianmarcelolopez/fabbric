# Tarea 5 — Definition of Done de T9

**Estado:** ✅ Completada (2026-07-12)
**Depende de:** tareas 1 a 4

## Objetivo

Cerrar la Fase 9 con el criterio del plan: *crear cartera, registrar un ingreso manual vinculado a un pedido, verificar que ese pedido puede avanzar de estado sin haber pasado por MP, y que el movimiento no se puede borrar mientras esté vinculado; ganancia bruta de un pedido coincide con `unitCostSnapshot` de sus ítems*.

## Checklist final (usuario, en navegador)

- [x] `/admin/finance`: cartera "Efectivo" creada con saldo inicial $100.000 → tarjeta con saldo correcto
- [x] Ingreso manual ($15.000, Venta) → saldo $133.000 = 100.000 + 15.000 + 18.000 del cobro; resumen del mes consistente (Ingresos $33.000 / Balance $33.000). El egreso manual quedó cubierto por la suite (33/33) — el circuito UI es idéntico al del ingreso
- [x] Pedido manual #5 **cobrado eligiendo la cartera** desde el detalle → Pagado + movimiento "Cobro pedido #5" en Finanzas con link al pedido
- [x] Avance de estado sin MP (criterio del plan) — verificado por suite (paid → preparing) y habilitado en la UI de T7
- [x] El movimiento vinculado NO tiene botón Borrar (visible en la captura); el manual sí; el 409 del backend lo cubrió la suite
- [x] Ganancia bruta $18.000 = total del pedido #5 (sin costo cargado → costo 0, bruta = precio). El caso con costo real lo verificó la suite: **+$12.000 = 2 × ($10.000 − $4.000)** exacto contra `unitCostSnapshot` (criterio del plan)
- [x] Webhook MP verificado por suite con firma HMAC real (`TESTPAY`): cartera "Mercado Pago" lazy + movimiento idempotente. La compra sandbox 100% real queda como opcional para cuando haya túnel activo (la infraestructura ya se probó real en T6)
- [x] Consola limpia; suites tareas 2 y 3 en verde (33/33 + 20/20), typecheck limpio en ambos contenedores

## Resultado (2026-07-12)

Verificado en navegador por el usuario (capturas de `/admin/finance`: tarjeta de cartera con saldo calculado, resumen mensual, tabla de movimientos con el cobro vinculado imborrable). **Criterio de la fase cumplido.** La regla bordart "cobrado antes de completado" quedó operativa de punta a punta: manual (cartera elegida) y online (cartera "Mercado Pago" automática).

## Al cerrar

- [x] Actualizar README + memoria; sugerir commit (`feat: t9 finanzas`)
- Siguiente: **T10 — Métricas/Dashboard** (armar `docs/T10_Metricas/` primero) — la última fase del MVP
