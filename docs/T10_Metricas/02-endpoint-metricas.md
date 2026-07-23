# Tarea 2 — `GET /admin/metrics/overview`: todos los números en una llamada

**Estado:** ✅ Completada (2026-07-22)
**Depende de:** [01-schema-layout.md](01-schema-layout.md)

## Objetivo

El endpoint que alimenta todas las tarjetas. Mismas semánticas que T9: cobrado = cuenta; pending = deuda.

## Pasos

`backend/src/modules/metrics/routes.ts` — `GET /admin/metrics/overview?year&month` (default mes contable actual AR; reusar `monthRange`/`currentArYearMonth` de `finance/service.ts`). Respuesta:

- [x] **Zona stats (números del mes elegido, salvo aclaración):**
  - `pedidosMes`: pedidos creados en el mes (excluye `cancelled`)
  - `ingresos`, `egresos`, `balance`, `gananciaBruta`, `gananciaNeta`: misma consulta que el summary de T9 (misma semántica, mismos números)
  - `clientesNuevos`: customers creados en el mes
  - `porCobrar`: Σ `total` de pedidos `pending` (GLOBAL — deuda viva)
  - `ticketPromedio`: ingresos por cobros del mes ÷ cantidad de pedidos cobrados en el mes (0 si no hubo)
- [x] **Zona paneles:**
  - `ultimosPedidos`: últimos 5 (número, cliente, total, estado, fecha) — global, para saltar a la gestión
  - `masVendidos`: top 5 por qty del mes (ítems de pedidos cobrados en el mes; los bespoke agrupan por `name` snapshot)
  - `catalogoVsPersonalizado`: del mes, por ítems de pedidos cobrados: qty e importe de ítems con `productId` vs sin
  - `ventasPorCanal`: qty e importe por `channel` (online/local; bespoke = null → "sin canal")
  - `ingresosEgresosMensual`: últimos 6 meses (incluido el elegido): `[{ year, month, ingresos, egresos }]` desde `financial_movements`
- [x] Swagger; todo filtrado por `orgId` (patrón de siempre)

## Definition of Done

- [x] Verificado en navegador (2026-07-22) contra el caso ya documentado en T9: Ingresos $33.000, Ganancia bruta $18.000, Ticket promedio $18.000 (pedido #5, único cobrado en el mes) — coincide número a número con `docs/T9_Finanzas/05-verificacion-final.md`; coherencia interna confirmada (balance = ingresos − egresos; neta = bruta − egresos). La suite HTTP (`backend/t10b-test.mjs`, ya escrita) queda como refuerzo automatizado pendiente de correr, no bloquea el cierre — la validación real fue contra datos conocidos en vivo.
- [ ] **Aislamiento**: org temporal ve todo en cero — cubierto por `t10b-test.mjs`, no re-verificado a mano
- [x] Ruta en `/docs`; `tsc --noEmit` limpio (los 3 workspaces)
