# Tarea 4 — Definition of Done de T4

**Estado:** ✅ Hecha (2026-07-08)
**Depende de:** tareas 1 a 3

## Objetivo

Cerrar la Fase 4 con el criterio del plan verificado por el usuario: *movimientos de stock por canal, umbral de stock crítico funcionando*.

## Checklist final (usuario, en navegador — con los datos reales de demo)

- [x] En `/admin/stock`: variantes de los 2 productos con su stock online/local
- [x] Entrada → el contador sube; venta → baja; historial con fecha/tipo/canal/delta
- [x] Venta mayor al disponible → *"Stock online insuficiente: la operación dejaría el stock en negativo"*, nada cambió
- [x] Umbral alto → variantes críticas (badge + filtro) y vuelta al valor normal
- [x] Editor de producto: stock solo-lectura con link a Stock
- [x] F5 persiste; consola sin errores
- [x] Suite de la tarea 2: 18/18; `tsc --noEmit` limpio; movimientos inmutables (no hay UPDATE/DELETE expuesto)

## Al cerrar

- Actualizar tabla de estado del README + memoria de sesión
- Ofrecer commit (pendiente desde T0)
- Siguiente fase: **T5 — Catálogo público** (armar `docs/T5_CatalogoPublico/` primero)
