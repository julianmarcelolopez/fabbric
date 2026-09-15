# Tarea 4 — `StockPage`: stat-cards + mover el formulario de movimiento

**Estado:** ✅ Hecha — verificada en vivo por el usuario en
`/admin/products?tab=stock`.

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T32/04)

Adoptar el markup concreto de `mockups/03-stock.html`, confirmado contra el
código real de `StockPage.tsx` — no es un cambio de piel puro, es el único
cambio estructural que los mockups dejaron ya decidido (junto con
Finanzas). Ver `analisis.md` sección 6a.

## Pasos

- [x] Reemplazado el `.card` de umbral+checkbox por 3 `.stat-card` dentro
      de `.dash-grid.dash-grid-stats`: "Variantes críticas" (`criticalCount`),
      "Umbral crítico (online + local ≤)" (mismo form/input/botón de
      antes, reubicado), "Solo críticos (N)" (mismo checkbox, reubicado
      como `<label className="stat-card">` clickeable, igual que el
      mockup).
- [x] `<MoveForm>` se sacó de la fila expandible de la tabla y se movió a
      un `.card` propio debajo de `<table className="grid">`, visible solo
      cuando `expanded?.mode === "move"` (vía un `movingItem` derivado con
      `data.items.find(...)`), con título
      `Registrar movimiento — {productName}, {talle} / {color}`.
- [x] Decisión tomada: `<History>` (`mode === "history"`) se dejó como
      fila expandible — no se movió, para no ampliar el riesgo de la
      tarea sin necesidad (no hay criterio de aceptación que dependa de
      esto).
- [x] El `background: "#F8F7F5"` de la fila expandida (ya corregido en la
      Tarea 2) se mantiene, pero ahora solo aplica a la fila de
      `<History>` — `<MoveForm>` ya no usa esa fila.

## Cómo se verificó

`npx tsc --noEmit` limpio. Verificación visual en vivo por el usuario en
`/admin/products?tab=stock`: las 3 tarjetas se ven correctamente
("Variantes críticas: 7", umbral con input+Guardar, "Solo críticos (7)");
"Historial" (sin tocar) sigue expandiendo la fila con la tabla de
movimientos; "Mover" en la fila "Remera taverniti, M / Rojo" mostró la
tarjeta "Registrar movimiento — Remera taverniti, M / Rojo" al final de la
página (debajo de la tabla, como diseña el mockup), con el formulario
completo (Tipo, Canal, Signo, Cantidad, Nota, botón "Registrar")
funcionando.

## Definition of Done

- [x] "Variantes críticas / Umbral / Solo críticos" se ven como 3
      tarjetas, no como una fila de formulario.
- [x] Clic en "Mover" en cualquier fila de la tabla muestra el formulario
      en una tarjeta separada debajo de la tabla (no expande una fila),
      con el producto/variante correcto en el título.
- [x] El formulario de movimiento funciona igual que antes (mismo POST a
      `/admin/variants/:id/stock-movements`).
- [x] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 7 (verificación final).
