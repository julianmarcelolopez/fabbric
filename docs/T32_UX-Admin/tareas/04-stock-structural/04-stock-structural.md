# Tarea 4 — `StockPage`: stat-cards + mover el formulario de movimiento

**Estado:** ⬜ Pendiente

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T32/04)

Adoptar el markup concreto de `mockups/03-stock.html`, confirmado contra el
código real de `StockPage.tsx` — no es un cambio de piel puro, es el único
cambio estructural que los mockups dejaron ya decidido (junto con
Finanzas). Ver `analisis.md` sección 6a.

## Pasos

- [ ] Reemplazar el `.card` de `StockPage.tsx:171-185` (umbral + checkbox
      "Solo críticos" en una sola fila) por 3 `.stat-card` dentro de
      `.dash-grid.dash-grid-stats` (o `.stat-grid`, alias equivalente
      definido en la Tarea 1):
      - "Variantes críticas" → valor `criticalCount`.
      - "Umbral crítico (online + local ≤)" → mismo `<form>`/`<input>`/
        botón "Guardar" de hoy, reubicado dentro del stat-card.
      - "Solo críticos (N)" → mismo `<input type="checkbox">` de hoy,
        reubicado.
- [ ] Mover `<MoveForm>` (`StockPage.tsx:244-261`, hoy una fila de tabla
      expandible con `colSpan={7}`) a un `.card` propio debajo de
      `<table className="grid">`, visible solo cuando
      `expanded?.mode === "move"`, con título
      `Registrar movimiento — {productName}, {talle} / {color}`.
- [ ] Decidir al implementar si `<History>` (`mode === "history"`) se
      mueve junto por consistencia o se queda como fila expandible — no
      hay criterio de aceptación que dependa de esto, es un detalle menor.
- [ ] El `style={{background:"#f9fafb"}}` de la fila expandida desaparece
      junto con este movimiento (evita duplicar trabajo con la Tarea 2 si
      esta tarea se hace primero).

## Definition of Done

- [ ] "Variantes críticas / Umbral / Solo críticos" se ven como 3
      tarjetas, no como una fila de formulario.
- [ ] Clic en "Mover" en cualquier fila de la tabla muestra el formulario
      en una tarjeta separada debajo de la tabla (no expande una fila),
      con el producto/variante correcto en el título.
- [ ] Guardar un movimiento sigue funcionando igual que antes (mismo
      POST a `/admin/variants/:id/stock-movements`, mismo refresh de la
      tabla tras guardar).
- [ ] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 7 (verificación final).
