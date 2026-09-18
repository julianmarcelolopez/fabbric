# Tarea 6 — PWA: pantalla de saldos pendientes

**Estado:** ⬜ Pendiente.

**Depende de:** Tarea 4. (No depende de la Tarea 5 — puede hacerse antes,
en paralelo, o después; lo único que necesita de verdad es que existan
`cobrar-saldo` y pedidos `partial` reales para probar.)

## Objetivo (según `plan.md`, T34/Fase 6)

Que el vendedor (o el dueño) pueda ver, desde la PWA, qué pedidos tienen
saldo pendiente y registrar el cobro cuando el cliente paga el resto.

## Alcance

`pwa/src/`:

- `SaldosPendientesScreen.tsx` nuevo — lista pedidos `partial` de la org
  (`GET /admin/orders?status=partial`, ya soportado por el `listQuery`
  existente, `backend/src/modules/orders/routes.ts:60-65` — **no hace
  falta endpoint nuevo**): cliente, saldo, fecha límite (resaltada si
  venció, cálculo client-side comparando con hoy). Tocar uno abre
  "Registrar cobro" (monto + medio de pago, **sin** "anticipo" entre las
  opciones acá) → `POST /admin/orders/:id/cobrar-saldo` (Tarea 4).
- `BottomNav.tsx` (después de T33: ya tiene `disabled`, `Dest` hoy es
  `"escanear" | "carrito"`, línea 3): suma tercer destino
  `"saldos"` / label "Saldos", con badge de cantidad si hay saldos
  vencidos — mismo patrón visual que el badge de `cartCount` ya existente
  (línea 52-71).
- `App.tsx`: nuevo `Screen` kind, ruteo agregado al `switch` de pantallas
  (mismo patrón state-based que ya usa toda la PWA, sin router).

## Criterio de aceptación

En Docker local: un pedido `partial` real (creado en la Tarea 5, o
directo por `curl` si esta tarea se hace antes) aparece en la lista,
"Registrar cobro" lo completa y pasa a `paid` — confirmar que desaparece
de esta lista después. El badge de vencidos se ve correctamente con una
`balanceDueDate` en el pasado.

## Dependencias

- **La bloquean:** Tarea 4.
- **Bloquea:** nada.
