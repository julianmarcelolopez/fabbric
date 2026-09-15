# Tarea 5 — `FinanzasPage`: resumen del mes como stat-cards

**Estado:** ✅ Hecha — verificada en vivo por el usuario en `/admin/finance`.

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T32/05)

Adoptar el patrón de `mockups/10-finanzas.html`, pero extendido a las 5
métricas reales que ya muestra `FinanzasPage.tsx` — el mockup solo mockea 3
(Ingresos/Egresos/Balance) porque es un ejemplo simplificado, no porque se
haya decidido sacar Ganancia bruta/Ganancia neta. Ver `analisis.md` sección
6b — decisión tomada ahí: no se pierde información.

## Pasos

- [x] Reemplazado el bloque de texto en línea de `FinanzasPage.tsx`
      (Ingresos, Egresos, Balance, Ganancia bruta, Ganancia neta) por 5
      `.stat-card` dentro de `.dash-grid.dash-grid-stats`, mismo patrón
      visual que Dashboard (Tarea 3) y Stock (Tarea 4). El selector de
      "Mes" quedó en su propio `.card`, separado del grid de tarjetas (el
      mockup no lo mostraba, no había un lugar natural dentro del grid
      para un `<input type="month">`).
- [x] Mantenido sin cambios el color semántico de
      `MOVEMENT_TYPE_UI.income.color`/`.expense.color`
      (`types.ts:325-326`, verde/rojo) dentro del `.stat-card-value` de
      Ingresos/Egresos y en "Ganancia neta". Balance y Ganancia bruta
      quedan con el navy default de `.stat-card-value` (antes eran texto
      sin color explícito — mejora visual, no cambio funcional).

## Cómo se verificó

`npx tsc --noEmit` limpio. Verificación visual en vivo por el usuario en
`/admin/finance`: las 5 métricas se ven como tarjetas — Ingresos (verde),
Egresos (rojo, $0,00), Balance/Ganancia bruta (navy), Ganancia neta
(verde) — ninguna se perdió respecto a la versión anterior.

## Definition of Done

- [x] Las 5 métricas se ven como tarjetas, sin haber perdido ninguna
      respecto a la versión actual.
- [x] Ingresos/Egresos/Ganancia neta conservan su color semántico
      verde/rojo dentro de la tarjeta.
- [x] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 7 (verificación final).
