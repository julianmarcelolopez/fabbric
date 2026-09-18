# Tarea 8 — Admin: filtro/badge + stat "Por cobrar"

**Estado:** ⬜ Pendiente.

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

## Criterio de aceptación

El filtro por "Saldo pendiente" en `OrdersPage.tsx` muestra los pedidos
`partial` correctamente. El número de "Por cobrar" coincide a mano con la
suma real de esos mismos pedidos.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** nada.
