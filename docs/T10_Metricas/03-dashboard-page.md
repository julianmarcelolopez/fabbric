# Tarea 3 — `DashboardCustomizable` + `DashboardPage` con las tarjetas

**Estado:** ✅ Completada (2026-07-22)
**Depende de:** [02-endpoint-metricas.md](02-endpoint-metricas.md)

## Objetivo

La pantalla principal del admin (la estrella de bordart): métricas del mes con tarjetas arrastrables y ocultables, persistidas por usuario.

## Pasos

- [x] `components/DashboardCustomizable.tsx` (archivo crítico del plan): contenedor con dos zonas (`stats`/`paneles`); modo edición con botón "Personalizar" (fuera de él NO se arrastra); drag & drop **nativo HTML5** (patrón `HomeSectionsPage` de T3); ocultar (✕ en cada tarjeta en modo edición) / mostrar (lista de ocultas al pie de cada zona); orden aplicado desde el layout con ids desconocidos ignorados y tarjetas nuevas al final
- [x] Persistencia: optimista + **debounce ~600 ms** → `PATCH /admin/dashboard-layout` (el layout inicial llega por `/admin/me` vía Outlet context — sin llamada extra)
- [x] `DashboardPage.tsx` reemplaza el contenido de `AdminHomePage` (que se borró, quedaba sin uso): selector de mes + `overview` en una llamada:
  - Stats: Pedidos / Ingresos / Egresos / Balance / Ganancia bruta / Ganancia neta / Clientes nuevos / Por cobrar / Ticket promedio
  - Paneles: Últimos pedidos (link a `/admin/orders/:id`) / Más vendidos / Catálogo vs Personalizado / Ventas por canal / Ingresos y egresos (barras CSS, 6 meses)
- [x] Montos con `formatPrice`; estados de carga/error consistentes
- [x] Super admin (sin `orgId`) ve un placeholder simple en vez del dashboard — el endpoint de métricas requiere `orgId`

## Definition of Done

- [x] Typecheck limpio (`shared`, `frontend`, `backend`); Vite compila
- [x] Verificación en navegador (2026-07-22, usuario): números correctos, arrastrar tarjeta → recargar → orden persiste, ocultar/mostrar funcionando, consola limpia → ver [04-verificacion-final.md](04-verificacion-final.md)
