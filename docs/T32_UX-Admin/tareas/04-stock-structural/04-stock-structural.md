# Tarea 4 — `StockPage`: stat-cards + mover el formulario de movimiento

**Estado:** ✅ Hecha — verificada en vivo por el usuario en
`/admin/products?tab=stock`. Las 3 stat-cards quedaron confirmadas; el
movimiento del formulario "Mover" a una card aparte se probó, se mostró al
usuario y **se revirtió a pedido suyo** — ver "Decisión final" abajo.

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
movimientos. "Mover" se probó primero como tarjeta aparte al final de la
página (funcionaba bien: título con producto/variante, formulario
completo, guardaba correctamente) — pero el usuario prefirió el
comportamiento anterior.

## Decisión final: "Mover" vuelve a ser una fila expandible

El usuario vio las dos versiones en vivo y pidió volver al comportamiento
original: el formulario aparece pegado a la fila del producto, sin tener
que bajar hasta el final de la página. Se revirtió únicamente esa parte —
las 3 stat-cards de arriba quedan tal como se diseñaron (confirmadas,
sin objeciones). `StockPage.tsx` vuelve a tener una sola fila expandible
por variante que muestra `<MoveForm>` o `<History>` según el modo, igual
que antes de esta tarea.

## Definition of Done

- [x] "Variantes críticas / Umbral / Solo críticos" se ven como 3
      tarjetas, no como una fila de formulario.
- [x] "Mover" — revertido a pedido del usuario: vuelve a expandir el
      formulario en la fila del producto (no una tarjeta aparte).
- [x] El formulario de movimiento funciona igual que antes (mismo POST a
      `/admin/variants/:id/stock-movements`).
- [x] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 7 (verificación final).
