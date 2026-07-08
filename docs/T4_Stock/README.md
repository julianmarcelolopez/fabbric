# T4 — Stock (Fase 4 de docs/plan.md)

## Objetivo de la fase

Que el stock deje de ser un número que se pisa a mano y pase a tener **historial auditable**: cada cambio queda registrado como un movimiento (`entrada`/`venta`/`ajuste`/`sync`) con su canal (`online`/`local`) y su delta — patrón heredado de byos-platform y validado por bordart. Además: umbral de stock mínimo configurable y vista de stock crítico para reponer a tiempo.

Criterio de verificación de la fase (de `docs/plan.md`): *movimientos de stock por canal, umbral de stock crítico funcionando*.

## Decisiones que marcan esta fase

- **El stock nunca se setea, se mueve**: la única forma de cambiar stock es registrar un movimiento (insert en `stock_movements` + update del contador de la variante, en transacción). El PATCH de variantes de T2 **deja de aceptar** `stockOnline`/`stockLocal` directos — la nota que dejamos en el código se cobra acá. El stock inicial cargado al crear la variante se mantiene (alta con stock = estado inicial, no movimiento).
- **Convención de signos por tipo**: `entrada` exige delta > 0, `venta` exige delta < 0, `ajuste` acepta cualquiera (≠ 0). `sync` queda **reservado** para el webhook de Mercado Pago (T6) y el descuento automático de venta online — no se expone en el form del admin.
- **El stock no puede quedar negativo**: si el delta deja el contador bajo cero → 400 con mensaje claro, y la transacción no se aplica.
- **`catalog_configs` nace en esta fase (parcialmente)**: el plan ubica `lowStockThreshold` en esa tabla. Se crea la tabla completa (según el modelo del plan) con una fila default por org creada lazy, pero en T4 solo se expone leer/editar el umbral — el CRUD completo de configuración de tienda (nombre, logo, tema, slug) es de T5, donde la tienda pública lo necesita.
- **Crítico = stock online + local ≤ umbral** (default 3), mostrando ambos números por separado en la vista para que el vendedor decida de qué canal reponer.

## Cómo trabajamos esta carpeta

Igual que T0-T3: una tarea por archivo, en orden, marcando estados al cerrar.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-schema-stock.md](01-schema-stock.md) — Tablas `stock_movements` + `catalog_configs` + schemas Zod | — | ✅ Hecha |
| 2 | [02-endpoints-stock.md](02-endpoints-stock.md) — Movimientos, historial, stock crítico, umbral | 1 | ✅ Hecha |
| 3 | [03-stock-page.md](03-stock-page.md) — `StockPage` (tabla, registrar movimiento, historial, umbral) | 2 | ✅ Hecha |
| 4 | [04-verificacion-final.md](04-verificacion-final.md) — Definition of Done de T4 | 1-3 | ✅ Hecha |

## Recordatorios operativos (gotchas acumulados)

- Cambios de schema → `npm run db:generate` + `npm run db:migrate` (SQL versionado; nunca push).
- Toda ruta nueva declara `schema` (Swagger `/docs`).
- Deps nuevas → rebuild + `--renew-anon-volumes`.
- Mutaciones nuevas se prueban también en navegador (CORS no se cubre server-to-server).
- Tests con secret key → Node, no PowerShell.
- Sin commits (decisión del usuario) — volver a ofrecer al cierre.

## Próximo paso al cerrar T4

**T5 — Catálogo público** (`docs/plan.md`, Fase 5): rutas `/public/*` sin auth resueltas por slug + la tienda `store/*` de solo lectura, reutilizando `HomeSectionsRenderer` y `ProductDetailView`. Ahí se completa el módulo `catalogConfig` que esta fase deja iniciado.
