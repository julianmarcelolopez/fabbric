# Tarea 8 — Admin: filtro/badge + stat "Por cobrar"

**Estado:** ✅ Hecha (2026-09-18) — verificada en vivo por el usuario: badge/filtro "Saldo pendiente" en `OrdersPage.tsx` correcto (#31/#32 en ámbar), stat "Por cobrar" del Dashboard mostrando el número fusionado ($237.000,00).

**Depende de:** Tarea 1. (Rama independiente — no depende de la Tarea 4 ni
de las Tareas 5-7, puede hacerse en paralelo con todo lo de arriba.)

## Objetivo (según `plan.md`, T34/Fase 8)

Que "Saldo pendiente" se pueda filtrar/ver en la lista de pedidos, y que
el total por cobrar tenga un lugar visible en el panel.

## Alcance

- `OrdersPage.tsx` — el filtro (`Object.entries(ADMIN_ORDER_STATUS)`,
  línea 55) y el badge (`ADMIN_ORDER_STATUS[order.status]`, línea 102) ya
  son data-driven: con `ADMIN_ORDER_STATUS.partial` sumado en la Tarea 1,
  esta pantalla queda resuelta **sin tocar su JSX** — confirmado
  explorando el archivo antes de escribir el plan, no es una suposición.
  Verificar igual que efectivamente se ve bien (el color ámbar, el label
  "Saldo pendiente"), no asumir que "data-driven" es sinónimo de
  "sin nada que mirar".
- `DashboardPage.tsx` / `FinanzasPage.tsx` — nuevo stat "Por cobrar" =
  suma de `saldoPendiente` de todos los pedidos `partial` de la org. Para
  el volumen puerta a puerta actual de Eliathi Modas, alcanza con sumar en
  el cliente sobre `GET /admin/orders?status=partial` (`total - pagado`
  por fila) — no hace falta una query agregada nueva en el backend a
  menos que el volumen crezca mucho.

## Hallazgo real: "Por cobrar" ya existía, con otro significado

El plan asumía que era un stat nuevo — no lo era. Ya existe en
`backend/src/modules/metrics/routes.ts` (comentario propio: "Deuda viva:
GLOBAL, no del mes"), pero sumaba **solo** pedidos `pending` (checkout
online sin pagar nada) — nada que ver con los saldos de anticipo. La
propuesta original del plan (sumarlo en el cliente sobre `GET
/admin/orders?status=partial`) hubiera dejado dos números de "deuda"
distintos sin relacionar en el mismo panel.

**Decisión (charlada con el usuario)**: fusionar en un solo número —
`receivableTotal(orgId)`, función nueva en `metrics/routes.ts`, suma
`pending.total` + `saldoPendiente` real de los `partial` (mismo patrón de
query agrupada que ya usa el `GET /admin/orders` de la Tarea 6, no una
consulta por pedido). El frontend (`DashboardPage.tsx:153`) no necesitó
ningún cambio — ya renderizaba `stats.porCobrar` tal cual, con un hint
("deuda viva, todos los pendientes") que sigue siendo preciso con el
número ampliado.

`OrdersPage.tsx` confirmado sin cambios — data-driven como esperaba el
plan.

`npx tsc --noEmit` limpio en `backend/` y `frontend/`.

## Criterio de aceptación

Pendiente de verificación visual — servidores dev ya corriendo
(`http://localhost:5173/admin/orders` y `/admin`). El filtro por "Saldo
pendiente" en `OrdersPage.tsx` debería mostrar los pedidos `partial`
correctamente. El número de "Por cobrar" del Dashboard debería coincidir a
mano con la suma de pedidos `pending` + el saldo real de los `partial`
visibles en `OrdersPage.tsx`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** nada.
