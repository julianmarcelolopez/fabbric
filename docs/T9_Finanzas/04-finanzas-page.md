# Tarea 4 — `FinanzasPage` + selector de cartera al cobrar

**Estado:** ✅ Completada (2026-07-12)
**Depende de:** [03-cobro-pedidos.md](03-cobro-pedidos.md)

## Objetivo

La vista de finanzas del admin (la pantalla estrella de bordart) y el ajuste en la gestión de pedidos: cobrar ahora pregunta **a qué cartera**.

## Pasos

- [x] Entrada "Finanzas" en el sidebar (después de Clientes), ruta `/admin/finance`
- [x] `FinanzasPage.tsx`:
  - Tarjetas de carteras (nombre, color, saldo calculado) + alta/edición/toggle activa
  - Selector de mes + tarjetas resumen: Ingresos / Egresos / Balance / Ganancia neta (con la bruta visible)
  - Tabla de movimientos del mes (fecha, cartera, categoría, descripción, monto con signo/color por tipo, pedido linkeado a `/admin/orders/:id` si corresponde) + filtros cartera/tipo
  - Alta de movimiento manual (tipo, cartera activa, monto, categoría con sugeridas vía `datalist`, descripción, fecha) — borrar solo los no vinculados (el botón ni aparece en los vinculados)
- [x] `OrderAdminDetailPage.tsx`: "Marcar cobrado" → select "Cobrar a cartera" (solo activas) + botón "Cobrar (venta manual)"; sin carteras activas → aviso con link a Finanzas
- [x] Estados de carga/error consistentes; montos con `formatPrice`

## Definition of Done

- [x] Typecheck limpio; Vite compila
- [ ] Verificación en navegador → tarea 5

## Notas de ejecución (2026-07-12)

- Tipos espejados en `types.ts` (`AdminWallet`, `AdminMovementRow`, `FinanceSummary`, `SUGGESTED_CATEGORIES`, `MOVEMENT_TYPE_UI`) — el admin no importa `@fabbric/shared`, patrón existente.
- Montos con `pesosToCents`/`formatPrice` de `lib/money` (coma decimal es-AR). Mes con `<input type="month">` default mes contable AR. El datalist de categorías cambia según el tipo elegido.
- En el detalle del pedido, si hay UNA sola cartera activa queda preseleccionada (un click menos en el caso típico).
- La ganancia bruta/neta del resumen llevan `title` con su fórmula (tooltip).
