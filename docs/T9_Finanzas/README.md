# T9 — Finanzas (Fase 9 de docs/plan.md)

## Objetivo de la fase

El módulo más "bordart" del plan: **carteras** (efectivo, banco, MP…) + **movimientos financieros** (ingresos/egresos) + la regla de oro validada en producción por Bordart: **cobrado antes de completado**. Cobrar un pedido crea un movimiento de ingreso vinculado e imborrable; la ganancia bruta/neta sale de los `unitCostSnapshot` que venimos acumulando desde T6. Es la anteúltima fase del MVP y deja lista la materia prima de las métricas de T10.

Criterio de verificación de la fase (de `docs/plan.md`): *crear cartera, registrar un ingreso manual vinculado a un pedido, verificar que ese pedido puede avanzar de estado sin haber pasado por MP, y que el movimiento no se puede borrar mientras esté vinculado; ganancia bruta de un pedido coincide con `unitCostSnapshot` de sus ítems*.

## Decisiones que marcan esta fase

- **Montos en centavos (int)**, como todo fabbric. Bordart guarda pesos con decimales — la conversión es un detalle del script de migración de datos post-MVP, no de este schema.
- **Carteras sin DELETE**: solo `active` on/off (igual que bordart, que ni siquiera tiene eliminar). `initialBalance` se fija al crear y no se edita — un ajuste posterior es un movimiento manual, así el saldo siempre es auditable. **Saldo = initialBalance + ingresos − egresos, siempre calculado, jamás persistido** (mismo principio que el stock: nunca "setear", solo mover).
- **Movimientos inmutables** (sin PATCH en v1). DELETE solo si `orderId` es null — vinculado a pedido → **409** (regla bordart literal: "No se puede eliminar un movimiento vinculado a un pedido").
- **`category` es texto libre** con las listas sugeridas de bordart en la UI (ingresos: Venta, Anticipo, Devolución, Otro ingreso; egresos: Tela / Material, Insumos, Mano de obra, Publicidad, Envíos, Impuestos, Alquiler, Servicios, Otro egreso). No es un enum: cada tienda tiene sus rubros.
- **`mark-paid` ahora exige cartera** (la `NOTA T9` que dejamos en `orders/routes.ts`): pending → paid + descuento de stock + movimiento `income` "Cobro pedido #N" (categoría Venta, vinculado) — **todo en la misma transacción**. Con esto todo pedido `paid` tiene respaldo financiero.
- **El webhook de MP también registra el ingreso**, en una cartera **"Mercado Pago" auto-creada lazy** (patrón `ensureConfig`). Si las ventas online no entraran a finanzas, el reporte mensual mentiría en cualquier tienda con checkout activo y las métricas de T10 no cerrarían. La plata en la cuenta de MP *es* una cartera.
- **Semántica del reporte mensual (heredada de bordart)**: `balance = ingresos − egresos`; **ganancia bruta** = Σ `(unitPrice − unitCostSnapshot) × qty` de los pedidos **cobrados en el mes** (mes del movimiento de cobro vinculado — la ganancia se cuenta cuando entra la plata); ítem sin costo cargado → costo 0. **Ganancia neta = bruta − egresos del mes.**
- **Sin backfill**: los pedidos cobrados antes de T9 (#1, #2, #4) no tienen movimiento — quedan fuera del reporte financiero (quien quiera, los registra a mano). El reporte arranca limpio desde esta fase.
- **`paid` → `cancelled` sigue permitido** y el movimiento no se toca (la plata entró); una devolución real se registra como movimiento manual.
- **Fecha contable = columna `date`** (no timestamp): default hoy en `America/Argentina/Buenos_Aires` — el reporte mensual agrupa por fecha contable, no por hora del servidor (UTC cruzaría de mes a la noche).

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-schema-migracion.md](01-schema-migracion.md) — Schema `wallets` + `financial_movements` (migración 0005) | — | ✅ Completada |
| 2 | [02-endpoints-finanzas.md](02-endpoints-finanzas.md) — Carteras CRUD + movimientos + reporte mensual | 1 | ✅ Completada |
| 3 | [03-cobro-pedidos.md](03-cobro-pedidos.md) — Cobro con cartera: `mark-paid` + webhook MP | 2 | ✅ Completada |
| 4 | [04-finanzas-page.md](04-finanzas-page.md) — `FinanzasPage` + selector de cartera al cobrar | 3 | ✅ Completada |
| 5 | [05-verificacion-final.md](05-verificacion-final.md) — Definition of Done de T9 | 1-4 | ✅ Completada |

**Fase completa (2026-07-12).** Verificada en navegador (cartera Efectivo, cobro del pedido #5 a cartera, movimiento vinculado imborrable) + suites 33/33 y 20/20. Commit sugerido: `feat: t9 finanzas`.

## Recordatorios operativos (gotchas acumulados)

- Migración: `npm run db:generate` + `db:migrate` desde `backend/` (directo, no pooler) — **nunca** `db:push`.
- Rutas nuevas → `schema` Swagger con Zod de `@fabbric/shared`. Mutaciones nuevas: probarlas también en navegador (CORS no se ve en las suites Node).
- `node`/`npx` pueden no estar en el PATH del host: typecheck y suites dentro de los contenedores (`docker compose exec backend|frontend npx tsc --noEmit`; scripts .mjs bajo `backend/` por el bind mount, borrar al terminar).
- Si se agregan dependencias: `docker compose up -d --renew-anon-volumes backend`.
- Sugerir commit al cierre (`feat: t9 finanzas`).

## Próximo paso al cerrar T9

**T10 — Métricas/Dashboard** (`docs/T10_Metricas/`): la última fase del MVP — dashboard personalizable (drag & drop persistido) con las métricas que dependen de finanzas: ganancia bruta/neta, ticket promedio, top productos, catálogo vs personalizado.
