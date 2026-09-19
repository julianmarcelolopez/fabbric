# Tarea 6 — PWA: pantalla de saldos pendientes

**Estado:** ✅ Hecha (2026-09-18) — verificada en vivo por el usuario (lista de pedidos `partial` correcta, saldo/fecha límite bien formateados).

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

## Resultado real

Implementado tal cual el alcance, más dos extensiones de backend que no
estaban explícitas en el plan original (necesarias para que la lista
tuviera datos):

- `GET /admin/orders` (list, no el detalle — ese ya los tenía desde la
  Tarea 4) no traía `balanceDueDate`/`pagado`/`saldoPendiente`. Se sumó
  una query agrupada (`groupBy(financialMovements.orderId)`, no N llamadas
  a `pagadoDePedido`) para calcular `pagado` de todos los pedidos listados
  de una sola vez. `AdminOrderRow` (frontend/admin) actualizado en paralelo
  con los mismos 3 campos, por consistencia con `AdminOrderDetail`.
- "Registrar cobro" queda como fila expandible dentro de la misma pantalla
  (estado local `openId`, mismo criterio que las tabs de `CarritoScreen`)
  en vez de navegar a un `Screen` nuevo en `App.tsx` — no hacía falta
  crecer el union de pantallas para esto.
- El badge de vencidos en `BottomNav` se recalcula en un `useEffect` de
  `App.tsx` cada vez que cambia `screen.kind` (no solo al entrar a
  "Saldos") — así el número se ve actualizado sin importar en qué pantalla
  esté el vendedor. Consulta liviana, no se optimizó con un callback de
  refresco más fino.

**Dos bugs reales encontrados y arreglados en la verificación visual (no
estaban en el alcance original)**:
1. `minHeight: "calc(100vh - 56px)"` en `CarritoScreen`/`ConfirmarScreen`/
   `EntradaOkScreen`/`VentaAgregadaOkScreen` quedó corto desde que el
   header pasó a fijo (T33/09, +40px) — generaba scroll de sobra sin
   contenido real. Se centralizaron `HEADER_HEIGHT`/`FOOTER_HEIGHT` en
   `theme.ts` y se corrigió el cálculo en las 4 pantallas.
2. `confirmVenta()` (Tarea 5) reseteaba `facturar`/`montoPagado`/
   `customerId`/etc. después de una venta pero no `medioPago` en sí — una
   venta con anticipo dejaba "Anticipo" pegado como default para la
   siguiente venta. Se agregó `setMedioPago("efectivo")` al reset.

`npx tsc --noEmit` y `npx vite build --mode production` limpios dentro del
contenedor Docker.

## Criterio de aceptación

✅ Cumplido — confirmado en vivo: dos pedidos `partial` reales (de la
Tarea 5) aparecen en la lista con cliente, saldo y fecha límite bien
formateados (`Vence`/`Vencido` según corresponda). "Registrar cobro" no se
probó en vivo en esta vuelta (la lógica de `cobrar-saldo` ya está
verificada por `curl` en la Tarea 4, mismo endpoint que usa esta pantalla).

## Dependencias

- **La bloquean:** Tarea 4.
- **Bloquea:** nada.
