# Tarea 3 — Cobro con cartera: `mark-paid` + webhook MP

**Estado:** ✅ Completada (2026-07-12)
**Depende de:** [02-endpoints-finanzas.md](02-endpoints-finanzas.md)

## Objetivo

Cerrar la regla bordart "**cobrado antes de completado**": desde acá, todo pedido que llega a `paid` deja su rastro financiero — venga por MP o por cobro manual. Es la `NOTA T9` que quedó esperando en `orders/routes.ts`.

## Pasos

- [ ] `POST /admin/orders/:id/mark-paid` — el body ahora **requiere `walletId`** (Zod en shared): dentro de la MISMA transacción de siempre (status → paid + stock por canal) se inserta el movimiento `income` "Cobro pedido #N", categoría Venta, `orderId` vinculado, fecha hoy AR. Cartera inexistente/ajena/inactiva → 400 sin tocar nada
- [ ] Webhook MP (`payments/webhook.ts`): al marcar `paid`, crear el movimiento `income` vinculado en la cartera **"Mercado Pago"** de la org (helper `ensureMpWallet` en `finance/service.ts`, lazy como `ensureConfig`) — monto = total del pedido, descripción "Cobro pedido #N (Mercado Pago)". **Idempotente**: si el pedido ya tiene movimiento de cobro vinculado, no duplicar (el webhook puede llegar repetido — ya lo vimos en T6)
- [ ] `paid → cancelled` no toca el movimiento (decisión del README: la devolución es un movimiento manual)

## Definition of Done

- [x] Suite HTTP: mark-paid sin `walletId` → 400; con cartera válida → pedido `paid` + stock descontado + movimiento vinculado con el total exacto; **borrar ese movimiento → 409**; el pedido avanzó de estado sin pasar por MP (criterio del plan); webhook simulado (`TESTPAY`, `MP_FAKE_PAYMENTS=true`) crea la cartera "Mercado Pago" y el movimiento; reenviar el mismo webhook NO duplica el movimiento
- [x] `ganancia bruta` del resumen coincide a mano con los `unitCostSnapshot` del pedido cobrado (criterio del plan)
- [x] Rutas actualizadas en `/docs`; `tsc --noEmit` limpio

## Notas de ejecución (2026-07-12)

- Suite: **20/20 ✅ a la primera**. El webhook de la suite va FIRMADO (HMAC calculado con `MP_WEBHOOK_SECRET` del env, manifest `id:<dataId>;ts:<ts>;` — el mismo formato que nos mordió en T6), no salteando la verificación.
- Verificaciones clave: cartera inválida → 400 **sin tocar el pedido** (sigue pending); movimiento con el total exacto ($20.000), categoría Venta, descripción "Cobro pedido #N"; borrar → 409; re-cobrar → 409 sin duplicar; **paid → preparing sin MP** (criterio del plan); resumen: ingresos +$20.000 y **ganancia bruta +$12.000 = 2 × ($10.000 − $4.000)** exacto contra los `unitCostSnapshot` (criterio del plan); webhook crea la cartera "Mercado Pago" (color #00b1ea) con el movimiento "(Mercado Pago)"; replay → `already_processed`, un solo movimiento.
- Implementación: `markPaidSchema` en shared (`{ walletId }`); `finance/service.ts` suma `ensureMpWallet` (lazy con `onConflictDoNothing` + releer para la carrera de la unique) y `recordOrderCharge` (idempotente: si el pedido ya tiene income vinculado, no inserta — belt & suspenders sobre el guard de `status !== "pending"`). Ambos reciben el `tx` del caller: el movimiento nace o muere con la transacción del cobro.
- Decisión fina: `ensureMpWallet` usa la cartera aunque esté inactiva — desactivarla no detiene las ventas online; la plata entró a MP igual.
