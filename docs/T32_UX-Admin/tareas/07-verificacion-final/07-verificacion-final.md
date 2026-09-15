# Tarea 7 — Verificación final

**Estado:** ⬜ Pendiente

**Depende de:** Tareas 1 a 6.

## Objetivo (según `plan.md`, T32/07)

Checklist heredado del Definition of Done de `spec-rediseno-admin.md`, sin
cambios — confirmar en vivo (browser real, no solo lectura de código) que
el rediseño se ve coherente en todo el panel y que no quedó ninguna
regresión funcional ni semántica.

## Checklist

- [ ] Las 13 páginas de `frontend/src/features/admin/pages/` se ven con la
      paleta nueva.
- [ ] Verificación visual en vivo en al menos 3 pantallas además de Stock
      (sugerido: Dashboard, Pedidos, Clientes) — el cambio se ve coherente
      en todo el panel, no solo donde se diseñó primero.
- [ ] `grep -rnoE "#[0-9a-fA-F]{3,6}" frontend/src/features/admin/pages/
      frontend/src/features/admin/components/` no devuelve nada de la
      paleta vieja (solo los semánticos confirmados en `analisis.md`
      sección 4b y el `#fcc424` de usuario, sección 4c).
- [ ] Estados semánticos (`.alert-warning`, `.hs-warn`, `.critical-row`,
      `.store-status`, deltas de stock/finanzas) se siguen distinguiendo
      del accent de marca — no todo es coral.
- [ ] Sidebar deslizable en mobile (≤768px) sigue funcionando igual que
      antes del cambio.
- [ ] Panel "Catálogo vs Personalizado" del Dashboard: las 2 barras se
      distinguen (coral/navy), no quedaron del mismo color.
- [ ] `StockPage`: "Mover" abre una tarjeta separada, no una fila
      expandida; guardar un movimiento sigue funcionando.
- [ ] `FinanzasPage`: las 5 métricas del resumen se ven, ninguna se perdió.
- [ ] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tareas 1 a 6.
- **Bloquea:** ninguna — es la última tarea de T32_UX-Admin.
