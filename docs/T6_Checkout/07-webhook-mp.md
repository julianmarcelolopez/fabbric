# Tarea 7 — Webhook de Mercado Pago: firma, pago real, `paid`, stock `sync`, idempotencia

**Estado:** ✅ Hecha (2026-07-09) — suite 13/13 PASS (webhook simulado con firma HMAC real)
**Depende de:** [06-checkout-mp.md](06-checkout-mp.md)

## Objetivo

El único lugar del sistema donde una orden pasa a `paid` y el stock online baja automáticamente. Paranoia por diseño (regla del plan): firma verificada, pago consultado a la API real, idempotente, nunca 200 silencioso.

## Pasos

- [x] `POST /webhooks/mercadopago` (`modules/payments/webhook.ts` — auth por firma HMAC):
  1. Firma `x-signature` verificada con `timingSafeEqual` sobre el manifest `id:<dataId>;request-id:<rid>;ts:<ts>;` → 401 si no matchea. Sin `MP_WEBHOOK_SECRET` configurado (dev sin túnel) acepta con warning — obligatorio en producción, anotado.
  2. Del request solo se toma el payment id → el pago se **consulta a la API real** de MP
  3. `approved` → transacción con recheck de `pending` (**idempotencia**), `paid` + `mpPaymentId`, descuento `stockOnline` con movimientos `sync` ("venta online #N"); clamp a 0 con warning si no alcanza
  4. `rejected`/`cancelled`/otros → 200 sin acción (v1 sin cancelación automática); eventos no-payment → 200 ignorado
  5. Pago aprobado sin orden que matchee → **500** (anomalía; MP reintenta — nunca 200 silencioso)
- [x] **Decisión dev: simulación firmada** (`MP_FAKE_PAYMENTS=true` habilita ids `TESTPAY:<status>:<orderId>` — escape hatch SOLO dev, documentado en env.ts; el túnel queda opcional para quien quiera el ciclo 100% real)
- [x] Swagger (tag "webhooks")

## Definition of Done

- [x] Suite 13/13: firma inválida → 401 (y la válida pasa la verificación HMAC real); approved → `paid` + stock −2 + movimiento `sync` con nota; **replay → `already_processed` sin doble descuento**; rejected → sin acción; orden inexistente → 500
- [x] El historial de stock muestra el `sync` con "venta online #1"
- [x] `tsc --noEmit` limpio; stock del catálogo restaurado tras el test
