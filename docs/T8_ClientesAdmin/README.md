# T8 — Clientes (Admin) (Fase 8 de docs/plan.md)

## Objetivo de la fase

El vendedor ve quiénes le compran: lista de clientes con métricas de compra (cantidad de pedidos, total gastado, última compra) y el detalle de cada uno con su historial completo — cada pedido clickeable hacia la gestión de T7. Es la fase **más corta** del plan: los datos ya existen (los crea el flujo de T6), solo falta exponerlos al admin.

Criterio de verificación de la fase (de `docs/plan.md`): *el cliente de Fase 6 aparece listado con historial correcto*.

## Decisiones que marcan esta fase

- **Solo lectura en v1**: el cliente se crea/edita a sí mismo (upsert del portal + su perfil); el admin lo consulta. Editar datos de contacto del cliente desde el admin, o notas internas tipo bordart (`tipo_cliente`, `origen`), quedan como mejora post-MVP si se extrañan — no agrandar la fase más corta.
- **Las métricas cuentan solo pedidos "reales"**: `totalSpent` suma pedidos en estado `paid`/`preparing`/`shipped`/`delivered` (los `pending` y `cancelled` no son plata). `orderCount` cuenta todos menos `cancelled` — un pending es un pedido, todavía no una venta.
- **El módulo ya existe** (`modules/customers/` nació mínimo en T7 para el selector del alta manual) — esta fase lo extiende, no lo crea.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-endpoints-clientes.md](01-endpoints-clientes.md) — Lista con métricas + detalle con historial | — | ✅ Completada |
| 2 | [02-customers-page.md](02-customers-page.md) — `CustomersPage` (tabla + detalle con historial clickeable) | 1 | ✅ Completada |
| 3 | [03-verificacion-final.md](03-verificacion-final.md) — Definition of Done de T8 | 1-2 | ✅ Completada |

**Fase completa (2026-07-10).** Verificada en navegador con los datos reales de T6/T7 (Patricia: 3 pedidos, $73.000). Commit sugerido: `feat: t8 clientes admin`.

## Recordatorios operativos (gotchas acumulados)

- Sin migraciones (los datos ya existen). Rutas → `schema` Swagger. Mutaciones nuevas: no hay (fase read-only). Tests con secrets → Node.
- Sugerir commit al cierre (el usuario ya maneja los suyos: `feat: t8 clientes admin`).

## Próximo paso al cerrar T8

**T9 — Finanzas** (`docs/T9_Finanzas/`): carteras + movimientos + "cobrado antes de completado" con registro financiero real (el `mark-paid` de T7 se refuerza) + ganancia bruta/neta con los `unitCostSnapshot` acumulados desde T6.
