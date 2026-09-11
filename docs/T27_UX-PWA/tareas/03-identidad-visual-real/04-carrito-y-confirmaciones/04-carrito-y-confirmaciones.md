# Tarea 4 — Carrito, Confirmar venta y las pantallas de confirmación

**Estado:** ✅ Hecha — verificada con Playwright (14/14 PASS, `pwa/t27-03-04-carrito-y-confirmaciones.mjs`). Última tarea de T27.

**Depende de:** Tarea 1 de esta fase. Depende también de la Fase 1 del plan general (quick wins) porque migra las pantallas `EntradaOkScreen`/`VentaAgregadaOkScreen` creadas ahí — no se puede empezar esta tarea antes de que esas pantallas existan.

## Objetivo

Migrar el resto del circuito (Carrito, Confirmar venta, y las dos confirmaciones de acción de la Fase 1 del plan general) a los tokens de color/tipografía.

## Pasos

### CarritoScreen

- [x] Reemplazados todos los hex sueltos por los tokens equivalentes.
- [x] Título "Venta en curso" y el total pasan a `Cormorant Garamond` (el total además a `colors.navy`, calcado de la prominencia que le da el mockup).
- [x] Chips de medio de pago: el chip seleccionado pasa a fondo navy (no coral).
- [x] Botón "Confirmar venta" se mantiene coral sólido.

### ConfirmarScreen

- [x] Reemplazados todos los hex sueltos por los tokens equivalentes (incluye `#201f1c` del botón de descarga de PDF y `#888780` del aviso de factura pendiente, que no estaban en la lista original pero también son hex sueltos del archivo).
- [x] "Venta registrada" pasa a `Cormorant Garamond` + `colors.navy`.
- [x] Botón "Volver a escanear" pasa a navy sólido (no coral), con `minHeight: 44` agregado (no lo tenía).

### EntradaOkScreen / VentaAgregadaOkScreen (creadas en la Fase 1 del plan general)

- [x] Migrados los hex temporales de la Fase 1 a los tokens definitivos de `theme.ts`.
- [x] Confirmado: el botón de cierre de `EntradaOkScreen` es navy, el de `VentaAgregadaOkScreen` es coral. Los títulos de ambas pantallas pasaron a `Cormorant Garamond` + `colors.navy` (no estaba explícito en el checklist original, pero sigue el mismo criterio aplicado a "Venta registrada"/"Venta en curso").

## Hallazgo: `App.tsx` había quedado fuera de las 4 tareas

Al hacer el barrido final (`grep` de hex sueltos en todo `pwa/src/`), aparecieron dos que no estaban asignados a ninguna de las 4 tareas de esta fase: el fondo/color de texto del wrapper raíz en [App.tsx](../../../../../pwa/src/App.tsx) (`#F7F3EC`/`#201f1c`) y el color del botón "Cerrar sesión" (`#888780`) — chrome compartido por todas las pantallas, nunca asignado a Login/BottomNav (Tarea 2) ni a ninguna pantalla específica. Se migraron acá (`colors.off`, `colors.text`, `colors.muted`) para que el criterio de aceptación del grupo ("ninguna pantalla sin tokens") quedara realmente completo al cerrar la fase.

## Definition of Done

- [x] Las cuatro pantallas (más `App.tsx`) no tienen ningún hex hardcodeado fuera de `pwa/src/lib/theme.ts` — confirmado con `grep -rE "#[0-9a-fA-F]{3,6}" pwa/src` sobre **todo** `pwa/src/`, no solo los 4 archivos de esta tarea: 0 resultados fuera de `theme.ts`.
- [x] Montos y títulos de confirmación usan `Cormorant Garamond`.
- [x] Probado el circuito completo con Playwright: agregar al carrito, elegir medio de pago, confirmar venta, ver la confirmación final — en ambos flujos (entrada y venta).
- [x] Botones de acción miden ≥44px de alto — confirmado por `boundingBox()`.

## Cómo se verificó

**Playwright** (`pwa/t27-03-04-carrito-y-confirmaciones.mjs`, viewport 390×844, org/usuario descartables): login → Registrar entrada → confirma que `EntradaOkScreen` usa Cormorant Garamond y botón navy → Agregar a la venta → confirma que `VentaAgregadaOkScreen` usa Cormorant Garamond y botón coral → "Ir al carrito" → confirma título Cormorant Garamond, chip de medio de pago navy al seleccionarlo, total en Cormorant Garamond + navy, "Confirmar venta" coral y ≥44px → confirma la venta real → confirma que "Venta registrada" usa Cormorant Garamond y que "Volver a escanear" es navy y mide ≥44px. **14/14 PASS.** Complementado con capturas de las 3 pantallas de confirmación/carrito (no versionadas) — coherentes con el resto de la app ya migrada.

Con esta tarea se cierra el plan completo de T27 (`docs/T27_UX-PWA/plan.md`): las 3 fases (quick wins, toggle de modo, identidad visual) quedan implementadas y verificadas.

## Dependencias

- **La bloquean:** Tarea 1 de esta fase y la Fase 1 del plan general (las pantallas de confirmación deben existir antes de migrarlas).
- **Bloquea:** nada — es la última tarea del plan de T27.
