# Tarea 2 — Endpoints: carteras + movimientos + reporte mensual

**Estado:** ✅ Completada (2026-07-12)
**Depende de:** [01-schema-migracion.md](01-schema-migracion.md)

## Objetivo

El módulo `modules/finance/` completo en su versión "libro contable": carteras con saldo calculado, movimientos manuales, y el resumen mensual con ganancia bruta/neta.

## Pasos

`backend/src/modules/finance/` (todo con `schema` Swagger, tag `finanzas (admin)`):

- [ ] `GET /admin/wallets` — todas las carteras de la org con **saldo calculado** (`initialBalance + Σ income − Σ expense`, un solo query con `left join` + `group by`, mismo patrón que T8)
- [ ] `POST /admin/wallets` — crear (409 si el nombre ya existe en la org)
- [ ] `PATCH /admin/wallets/:id` — name/icon/color/active (sin initialBalance; 404 si es de otra org)
- [ ] `GET /admin/finance/movements?year&month&walletId?&type?` — lista del mes (default: mes actual) descendente por fecha, con nombre de cartera y `orderNumber` si está vinculado
- [ ] `POST /admin/finance/movements` — alta manual (income/expense); la cartera debe ser de la org y estar activa; `date` default hoy AR
- [ ] `DELETE /admin/finance/movements/:id` — **409 `linked_to_order` si tiene `orderId`** (regla bordart); 404 si es de otra org
- [ ] `GET /admin/finance/summary?year&month` — del mes: `ingresos`, `egresos`, `balance` (= ingresos − egresos), `gananciaBruta` (Σ `(unitPrice − coalesce(unitCostSnapshot, 0)) × qty` de los ítems de pedidos con movimiento de cobro vinculado **fechado en el mes**), `gananciaNeta` (= bruta − egresos)

## Definition of Done

- [x] Suite HTTP (contenedor backend, tokens reales): crear cartera → saldo = initialBalance; ingreso y egreso manuales mueven el saldo y el resumen; borrar movimiento libre OK; el filtro por cartera/tipo funciona; validaciones (amount ≤ 0, cartera inactiva o ajena → error)
- [x] **Aislamiento**: org temporal no ve carteras ni movimientos ajenos (lista vacía, 404 por id)
- [x] Rutas en `/docs`; `tsc --noEmit` limpio

## Notas de ejecución (2026-07-12)

- Suite: **33/33 ✅**. Cobertura: crear/duplicado 409/editar/renombrar-a-existente 409; saldo calculado (100000 + 50000 − 20000 = 130000) con `movementCount`; fecha default = hoy AR verificada; filtros mes/cartera/tipo; resumen (ingresos/egresos/balance y bruta 0 / neta = −egresos sin cobros vinculados); validaciones (amount 0, cartera inexistente/inactiva → 400 `inactive_wallet`; `initialBalance` en PATCH ignorado por Zod — sigue en 100000); borrado libre OK / repetido 404 / **vinculado a pedido → 409 `linked_to_order`** (probado insertando el vínculo directo en DB — mark-paid llega en la tarea 3); aislamiento completo (listas vacías, 404 por id ajeno, resumen en cero); 4 rutas en Swagger. Cleanup verificado.
- Implementación: `modules/finance/routes.ts` + `service.ts` (helpers `todayAr`/`monthRange`/`currentArYearMonth`/`requireActiveWallet` — los reusa la tarea 3). Saldo con `sum(case when income then amount else -amount end)` en un solo query. La ganancia bruta del summary sale de los `order_items` de pedidos con movimiento de cobro fechado en el mes (subquery `in`).
- La lista de movimientos ordena por fecha contable desc y desempata por `createdAt` desc.
