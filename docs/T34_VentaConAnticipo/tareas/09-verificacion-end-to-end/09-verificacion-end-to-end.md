# Tarea 9 — Verificación end-to-end

**Estado:** ⬜ Pendiente.

**Depende de:** Tarea 5, Tarea 6, Tarea 7, Tarea 8 (las dos ramas, PWA y
Admin, tienen que estar cerradas).

## Objetivo (según `plan.md`, T34/Fase 9)

Confirmar que el circuito completo funciona de punta a punta, desde los
dos clientes (PWA y admin), no solo que cada pieza pasó su propio
criterio de aceptación por separado.

## Checklist

- [ ] `npx tsc --noEmit` limpio en los 3 workspaces (repetir con todo
      junto, no solo por tarea).
- [ ] Circuito completo en Docker: PWA crea una venta con anticipo →
      aparece en `partial` tanto en la PWA (Tarea 6) como en el admin
      (`OrdersPage`, Tarea 8) → se cobra el resto **desde el admin** →
      pasa a `paid` → ya no aparece en ninguna lista de pendientes.
- [ ] Circuito inverso: otra venta con anticipo, cobrada esta vez
      **desde la PWA** — confirma que de verdad es el mismo endpoint
      desde los dos lados (decisión 1 de `analisis.md`), no dos caminos
      que casualmente se parecen.
- [ ] Intentar cobrar de más en cualquiera de los dos clientes → 400, sin
      romper nada ni dejar movimientos a medias.
- [ ] Revisar contra los "Criterios de aceptación" de `analisis.md`
      (sección final) uno por uno.
- [ ] Confirmar que una venta con un medio de pago normal
      (efectivo/transferencia/tarjeta/mercadopago) sigue funcionando
      exactamente igual que antes de T34 — sin regresión.

## Dependencias

- **La bloquean:** Tarea 5, 6, 7, 8.
- **Bloquea:** nada — es la última tarea de T34.
