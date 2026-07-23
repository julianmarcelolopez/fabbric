# Tarea 1 — Endpoints: lista con métricas + detalle con historial

**Estado:** ✅ Completada (2026-07-10)
**Depende de:** — (extiende `modules/customers/` de T7)

## Objetivo

Que la lista de clientes deje de ser un select plano y cuente la historia comercial de cada uno.

## Pasos

`backend/src/modules/customers/routes.ts` (extender, Swagger):

- [ ] `GET /admin/customers` — **extender** con agregados por cliente:
  - `orderCount` (pedidos no cancelados), `totalSpent` (suma de `total` en estados paid/preparing/shipped/delivered), `lastOrderAt` (fecha del último pedido no cancelado)
  - Ordenado por `lastOrderAt` descendente (los clientes activos primero; sin pedidos al final, por nombre)
  - Query `search?` opcional (nombre o email, case-insensitive) — barato de hacer ahora, útil cuando haya cientos
- [ ] `GET /admin/customers/:id` — perfil completo (email, phone, address, fecha de alta) + `orders`: historial descendente (id, número, fecha, estado, tipo derivado, total) — reutiliza `deriveOrderType`
- [ ] De otra org → 404 (patrón de siempre)

## Definition of Done

- [x] Suite HTTP: la lista muestra a la clienta real (Patricia) con `orderCount`/`totalSpent`/`lastOrderAt` correctos contra la DB (ojo: los pedidos cancelados no cuentan; verificar creando un pending temporal que NO sume a totalSpent pero SÍ a orderCount); `search` matchea por nombre y por email; el detalle trae el historial en orden con tipos derivados
- [x] **Aislamiento**: staff de otra org → lista vacía, 404 por id
- [x] Rutas en `/docs`; `tsc --noEmit` limpio

## Notas de ejecución (2026-07-10)

- Suite: **33/33 ✅** (script temporal en el contenedor backend, borrado tras la corrida). Cobertura: métricas de cada cliente recalculadas en JS desde un select plano (no la misma query del endpoint), orden `lastOrderAt desc nulls last` + nombre, search por nombre/email case-insensitive y `%` escapado (se busca literal, no comodín), detalle con tipos derivados correctos (#1/#2 catalogo, #4 mixto), pending temporal (suma a `orderCount`, no a `totalSpent`, mueve `lastOrderAt`) y cancelado (deja de contar en todo, `lastOrderAt` retrocede), 404 por id inexistente, aislamiento con org+staff temporales, ambas rutas en Swagger. Cleanup verificado (0 residuos).
- **Patricia verificada con datos reales: 3 pedidos, totalSpent $73.000** (#1 $25.000 + #2 $28.000 + #4 $20.000) — el criterio de la fase ya se cumple a nivel API.
- Implementación: agregados en SQL con `filter (where ...)` sobre un `left join` + `group by` (una sola query para la lista); `search` con `ilike` escapando `\`, `%` y `_`. El detalle deriva el tipo con `deriveOrderType` de shared, igual que orders.
- La respuesta no expone `googleSub` ni `orgId` (selects explícitos, patrón de T5).
