# Tarea 4 — Definition of Done de T10 (y del MVP)

**Estado:** ✅ Completada (2026-07-22)
**Depende de:** tareas 1 a 3

## Objetivo

Cerrar la Fase 10 — y con ella el MVP — con el criterio del plan: *los números del dashboard coinciden con los pedidos y movimientos cargados; reordenar/ocultar tarjetas del dashboard persiste tras recargar*.

## Checklist final (usuario, en navegador)

- [x] `/admin` (Dashboard): las tarjetas muestran números que coinciden con lo cargado — cotejadas contra `/admin/orders` (5 pedidos de julio, ninguno `pending` → Por cobrar $0) y contra los valores ya documentados en `docs/T9_Finanzas/05-verificacion-final.md` (Ingresos $33.000, Ganancia bruta $18.000, Ticket promedio $18.000 — coinciden exacto)
- [x] "Personalizar" → arrastrar una tarjeta de stats a otra posición → salir del modo edición → **recargar la página** → el orden persiste (criterio del plan) — confirmado por el usuario
- [x] Ocultar una tarjeta → recargar → sigue oculta; mostrarla de nuevo → vuelve — confirmado por el usuario
- [x] Fuera del modo edición no se puede arrastrar nada
- [x] Consola limpia; typecheck limpio en los 3 workspaces (`shared`, `frontend`, `backend`)

## Resultado (2026-07-22)

Verificado en navegador por el usuario. **Criterio de la fase cumplido**: los números del dashboard coinciden con los pedidos y movimientos reales, y el layout personalizado (orden + ocultas) persiste tras recargar. La suite HTTP de la tarea 2 (`backend/t10b-test.mjs`) quedó escrita pero sin correr — la validación real fue en vivo contra un caso ya conocido de T9; correrla queda como refuerzo de regresión, no bloquea el cierre.

## Al cerrar

- [x] Actualizar README + memoria; sugerir commit (`feat: t10 metricas dashboard`)
- **🎉 MVP COMPLETO** — actualizar `docs/plan.md` si corresponde y plantear el roadmap post-MVP: deploy, migración de datos de Bordart (tenant #1), RLS, MP marketplace por tenant, rate-limiting, billing SaaS
