# Tarea 3 — `StockPage` (tabla, registrar movimiento, historial, umbral)

**Estado:** ✅ Hecha (2026-07-08) — verificada en navegador por el usuario
**Depende de:** [02-endpoints-stock.md](02-endpoints-stock.md)

## Objetivo

La pantalla de stock del admin: ver todo el stock de un vistazo con lo crítico resaltado, registrar movimientos sin salir de la tabla, y consultar el historial de cualquier variante.

## Pasos

- [x] Entrada "Stock" en el sidebar, ruta `/admin/stock`
- [x] `StockPage.tsx`:
  - Tabla con producto, talle/color/sku, online, local, total, badge crítico con fila resaltada en rojo suave; filtro "Solo críticos (N)"
  - "Mover" expandible por fila: tipo/canal/cantidad (la UI deriva el signo: entrada suma, venta resta, ajuste pide signo) + nota → POST y refresco
  - "Historial" expandible: fecha localizada, tipo, canal, delta coloreado (+verde/−rojo), nota; aclara que el stock inicial del alta no genera movimiento
  - Umbral editable arriba (PATCH) — los badges se recalculan al guardar
  - Errores del 400 (`insufficient_stock`) visibles
- [x] `VariantEditor`: stock solo-lectura con tooltip + leyenda con link a Stock; el alta de variante conserva el stock inicial

## Definition of Done

- [x] Typecheck limpio; Vite compila; módulo servido desde el contenedor
- [x] Verificación en navegador (tarea 4) — OK del usuario
