# Tarea 5 — `FinanzasPage`: resumen del mes como stat-cards

**Estado:** ⬜ Pendiente

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T32/05)

Adoptar el patrón de `mockups/10-finanzas.html`, pero extendido a las 5
métricas reales que ya muestra `FinanzasPage.tsx` — el mockup solo mockea 3
(Ingresos/Egresos/Balance) porque es un ejemplo simplificado, no porque se
haya decidido sacar Ganancia bruta/Ganancia neta. Ver `analisis.md` sección
6b — decisión tomada ahí: no se pierde información.

## Pasos

- [ ] Reemplazar el bloque de texto en línea de `FinanzasPage.tsx:285-299`
      (Ingresos, Egresos, Balance, Ganancia bruta, Ganancia neta) por 5
      `.stat-card` dentro de `.dash-grid.dash-grid-stats`, mismo patrón
      visual que Dashboard (Tarea 1/3) y Stock (Tarea 4).
- [ ] Mantener sin cambios el color semántico de
      `MOVEMENT_TYPE_UI.income.color`/`.expense.color`
      (`types.ts:325-326`, verde/rojo) dentro del `.stat-card-value` de
      Ingresos/Egresos y en "Ganancia neta" cuando corresponda (línea 298:
      `summary.gananciaNeta >= 0 ? income.color : expense.color`).

## Definition of Done

- [ ] Las 5 métricas se ven como tarjetas, sin haber perdido ninguna
      respecto a la versión actual.
- [ ] Ingresos/Egresos/Ganancia neta conservan su color semántico
      verde/rojo dentro de la tarjeta.
- [ ] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 7 (verificación final).
