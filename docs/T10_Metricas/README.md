# T10 — Métricas/Dashboard (Fase 10 de docs/plan.md)

## Objetivo de la fase

**La última fase del MVP.** El Dashboard del admin deja de ser una página vacía: tarjetas de métricas del mes (pedidos, ingresos, ganancia bruta/neta, ticket promedio, clientes nuevos, por cobrar) + paneles (últimos pedidos, más vendidos, catálogo vs personalizado, ventas por canal, ingresos/egresos de los últimos meses) — todo **personalizable por usuario**: drag & drop de tarjetas + ocultar/mostrar, persistido en la base (patrón `DashboardCustomizable` de bordart, su pantalla principal).

Criterio de verificación de la fase (de `docs/plan.md`): *los números del dashboard coinciden con los pedidos y movimientos cargados; reordenar/ocultar tarjetas del dashboard persiste tras recargar*.

## Decisiones que marcan esta fase

- **Un solo endpoint** `GET /admin/metrics/overview?year&month`: todos los números del dashboard en una llamada (una sola ida y vuelta, un solo estado de carga). Mismas semánticas que T9 — **"cobrado" es lo que cuenta**: ingresos/ganancias salen de los movimientos de cobro del mes; los `pending` no son plata.
- **Ticket promedio** = ingresos por cobros del mes ÷ pedidos cobrados en el mes. **Por cobrar** = Σ total de pedidos `pending` (global, no del mes — es deuda viva, no una métrica mensual).
- **"Canal de adquisición de clientes" del plan se reinterpreta como "ventas por canal" (online/local)** desde `order_items.channel`: `customers` no tiene campo `origen` (quedó como mejora post-MVP en T8, junto con las notas internas tipo bordart). Cuando ese campo exista, la tarjeta de origen se agrega al set — el layout es forward-compatible.
- **Layout por USUARIO, no por org** (dos vendedores, dos dashboards): columna `dashboard_layout` jsonb en `admin_users` (patrón bordart literal: `usuarios.dashboard_layout`). Estructura: dos zonas `stats`/`paneles`, cada una `{ orden: string[], ocultas: string[] }`. **Forward-compatible**: ids desconocidos se ignoran al renderizar; tarjetas nuevas (no listadas en `orden`) aparecen al final visibles.
- **Drag & drop nativo HTML5** (el patrón que ya validamos en `HomeSectionsPage` de T3) — sin sumar `dnd-kit` como dependencia. Modo edición explícito (botón "Personalizar"): fuera de él no se arrastra nada, como bordart.
- **Persistencia con debounce (~600 ms)** vía `PATCH /admin/dashboard-layout`; optimista en la UI (el layout ya cambió mientras se guarda).
- **Gráfico de ingresos/egresos mensual con barras CSS** (últimos 6 meses) — sin librería de charts en v1.
- `AdminHomePage` (el placeholder del Dashboard) se reemplaza por la página real.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-schema-layout.md](01-schema-layout.md) — `dashboard_layout` (migración 0006) + `PATCH /admin/dashboard-layout` | — | ✅ Completada |
| 2 | [02-endpoint-metricas.md](02-endpoint-metricas.md) — `GET /admin/metrics/overview` con todos los números | 1 | ✅ Completada |
| 3 | [03-dashboard-page.md](03-dashboard-page.md) — `DashboardCustomizable` + `DashboardPage` con las tarjetas | 2 | ✅ Completada |
| 4 | [04-verificacion-final.md](04-verificacion-final.md) — Definition of Done de T10 (y del MVP) | 1-3 | ✅ Completada |

## Recordatorios operativos (gotchas acumulados)

- Migración: `db:generate -- --name dashboard_layout` + `db:migrate` — desde el contenedor usar el session pooler (`sed s/:6543/:5432/` sobre `DATABASE_URL`; `DIRECT_URL` es IPv6-only). **Nunca** `db:push`.
- Rutas nuevas → `schema` Swagger con Zod de shared. Typecheck y suites dentro de los contenedores.
- Fechas contables en AR (helpers `todayAr`/`monthRange` de `finance/service.ts` — reusar, no duplicar).
- Sugerir commit al cierre (`feat: t10 metricas dashboard`).

## Próximo paso al cerrar T10

**El MVP queda completo.** Lo que sigue es el roadmap post-MVP de `docs/plan.md`: deploy, migración de datos de Bordart (tenant #1), RLS, MP marketplace por tenant, rate-limiting en rutas públicas, billing SaaS.
