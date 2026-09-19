# Tarea 9 — Verificación end-to-end

**Estado:** ✅ Hecha (2026-09-18) — **T34 completa.**

**Depende de:** Tarea 5, Tarea 6, Tarea 7, Tarea 8 (las dos ramas, PWA y
Admin, tienen que estar cerradas).

## Objetivo (según `plan.md`, T34/Fase 9)

Confirmar que el circuito completo funciona de punta a punta, desde los
dos clientes (PWA y admin), no solo que cada pieza pasó su propio
criterio de aceptación por separado.

## Checklist

- [x] `npx tsc --noEmit` limpio en los 3 workspaces (backend/frontend/pwa,
      corridos juntos, no solo por tarea).
- [x] Circuito completo en Docker: pedidos con anticipo (#31, #32) creados
      desde la PWA aparecieron en `partial` tanto en la PWA (Saldos) como
      en el admin (`OrdersPage`) al mismo tiempo.
- [x] Pedido #31 cobrado **desde la PWA** — completó el saldo, pasó a
      `paid` solo, y desapareció de la lista de pendientes en los dos
      clientes. Pedido #32 probado **desde el admin** (misma tarjeta
      "Saldo pendiente", Tarea 7) — confirma que es el mismo endpoint
      desde los dos lados (decisión 1 de `analisis.md`), no dos caminos
      que casualmente se parecen.
- [x] Intentar cobrar de más — rechazado sin romper nada ("no permite
      pagar más que la deuda", confirmado por el usuario).
- [x] Venta con medio de pago normal (efectivo) — funciona exactamente
      igual que antes de T34, sin regresión.
- [x] Revisado contra los "Criterios de aceptación" de `analisis.md`
      (sección final) — los 7 puntos cumplidos, ver detalle abajo.

## Cruce final contra `analisis.md`

| Criterio de `analisis.md` | Estado |
|---|---|
| Venta con anticipo: descuenta stock, nace `partial`, un único movimiento por el anticipo, guarda cliente/fecha límite | ✅ Tarea 3 (curl) + Tarea 5 (PWA en vivo, #31/#32 reales) |
| "Cobrar saldo" funciona igual desde PWA y admin, mismo endpoint | ✅ #31 desde PWA, #32 desde admin |
| Se completa con uno o más cobros parciales → pasa a `paid` solo | ✅ Tarea 4 (curl) + #31 en vivo |
| Cobrar de más devuelve 400, sin dejar movimientos a medias | ✅ Tarea 4 (curl) + confirmado en vivo |
| `OrdersPage.tsx` muestra y filtra "Saldo pendiente" | ✅ Tarea 8 (visual) |
| Stat "Por cobrar" coincide con la suma real | ✅ Tarea 8 (visual, $237.000) |
| `tsc --noEmit` limpio en los 3 workspaces | ✅ (arriba) |

## Dependencias

- **La bloquean:** Tarea 5, 6, 7, 8.
- **Bloquea:** nada — es la última tarea de T34.
