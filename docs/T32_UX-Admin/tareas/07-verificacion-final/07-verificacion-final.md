# Tarea 7 — Verificación final

**Estado:** ✅ Hecha.

**Depende de:** Tareas 1 a 6.

## Objetivo (según `plan.md`, T32/07)

Checklist heredado del Definition of Done de `spec-rediseno-admin.md`, sin
cambios — confirmar en vivo (browser real, no solo lectura de código) que
el rediseño se ve coherente en todo el panel y que no quedó ninguna
regresión funcional ni semántica.

## Checklist

- [x] Las 13 páginas de `frontend/src/features/admin/pages/` se ven con la
      paleta nueva (heredada de `admin.css`, sin tocar JSX salvo Stock y
      Finanzas).
- [x] Verificación visual en vivo en 5 pantallas (Productos, Stock,
      Mi tienda, Finanzas, Dashboard) — el cambio se ve coherente en todo
      el panel.
- [x] Barrido final de `grep -rnoE "#[0-9a-fA-F]{3,6}"` sobre **todo**
      `frontend/src/features/admin/` (no solo `pages/`+`components/`, para
      cubrir el hueco que dejó `types.ts` fuera de los greps anteriores):
      solo quedan los 2 valores de `ADMIN_ORDER_STATUS` (`types.ts:171-172`),
      dejados a propósito (semántico, ver `analisis.md` sección 9bis).
- [x] Estados semánticos (`.alert-warning`, `.hs-warn`, `.critical-row`,
      `.store-status`, deltas de stock/finanzas, `ADMIN_ORDER_STATUS`) se
      siguen distinguiendo del accent de marca — no todo es coral.
- [x] Sidebar deslizable en mobile (≤768px) — verificado dos veces: script
      Playwright descartable (org/usuario de prueba, limpiados al
      terminar) confirmó 5/5 checks (botón hamburguesa visible, sidebar
      arranca fuera de pantalla, overlay aparece al abrir, sidebar entra
      en pantalla, color navy correcto, overlay cierra al tocarlo fuera) y
      el usuario lo confirmó en vivo con captura propia en un viewport
      angosto (sidebar navy, link activo coral, nav agrupada, overlay).
- [x] Panel "Catálogo vs Personalizado" del Dashboard: las 2 barras se
      distinguen (coral/navy), no quedaron del mismo color.
- [x] `StockPage`: "Mover" — **corrección respecto al plan original**: no
      quedó como tarjeta separada. Se probó así, el usuario lo vio en vivo
      y pidió volver al comportamiento anterior (fila expandible, como
      "Historial") — ver Tarea 4. Guardar un movimiento funciona igual
      que siempre.
- [x] `FinanzasPage`: las 5 métricas del resumen se ven como stat-cards,
      ninguna se perdió.
- [x] `npx tsc --noEmit` limpio en `frontend/` (verificado después de
      cada tarea, y una última vez al cierre).

## Nota aparte, no relacionada con T32

Durante esta verificación apareció `docs/T20_UX-Store.zip`: figura borrado
del disco (`git status` lo marca como `D`) pero commiteado en `a2ae7ea`
("adding t-21-adminConfig"). No se tocó — no tiene relación con ningún
archivo de `admin/` ni con esta tarea, se deja para que el usuario decida
si restaurarlo o confirmarlo como borrado intencional con un commit propio.

## Dependencias

- **La bloquean:** Tareas 1 a 6.
- **Bloquea:** ninguna — es la última tarea de T32_UX-Admin.
