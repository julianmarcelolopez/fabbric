# Tarea 6 — `POST /public/:slug/checkout` + preferencia MP + página de checkout

**Estado:** ✅ Hecha (2026-07-09) — suite 15/15 PASS con preferencia MP sandbox real
**Depende de:** [03-shipping-zones.md](03-shipping-zones.md), [04-customer-auth.md](04-customer-auth.md), [05-cart-frontend.md](05-cart-frontend.md)

## Objetivo

El corazón comercial: convertir un carrito en una orden `pending` con snapshot + preferencia de Mercado Pago, y mandar al comprador a pagar. Server-side manda: precios y stock se releen de la DB, nunca del cliente.

## Pasos

### Backend (`modules/payments/` — archivo crítico del plan)

- [x] **Decisión: REST directo con fetch, sin SDK** (`modules/payments/service.ts` — 2 llamadas: crear preferencia con `X-Idempotency-Key` y consultar pago). El envío viaja como ítem extra de la preferencia.
- [x] `env.ts`: `MP_ACCESS_TOKEN` requerido; `FRONTEND_URL` (default localhost:5173) para back_urls; `MP_WEBHOOK_URL`/`MP_WEBHOOK_SECRET` opcionales hasta la tarea 7
- [x] `POST /public/:slug/checkout` — requiere `requireCustomerAuth`; body `checkoutSchema` (+ merge de ítems duplicados de la misma variante):
  1. En **transacción**: relee variantes (precio efectivo `priceOverride ?? price`, producto visible/no-pausado) → 400 si algo no existe o no es comprable
  2. Valida `stockOnline >= qty` por ítem → 400 `insufficient_stock` con detalle de qué falta (**el stock NO se descuenta acá** — se descuenta al confirmarse el pago, decisión documentada: preferimos sobreventa marginal a stock fantasma por carritos abandonados)
  3. Calcula subtotal + envío (`freeShippingFrom` aplica) + total; genera `orderNumber` (unique por org con retry)
  4. Crea `orders` (pending) + `order_items` con snapshots
  5. Crea la preferencia MP: items, `external_reference` = order id, `back_urls` (success/failure/pending → `/store/:slug/checkout/result`), `notification_url` (webhook — configurable por env para el túnel)
  6. Guarda `mpPreferenceId`, devuelve `{ orderId, initPoint }`
- [ ] Swagger (tag "checkout")

### Frontend

- [x] `CheckoutPage`: sin login → CTA Google; datos de contacto prefilleados del perfil (PATCH antes de la orden); select de zona con "gratis desde" aplicado en vivo en el resumen; "Pagar con Mercado Pago" → redirect a `initPoint`
- [x] `CheckoutResultPage`: lee `collection_status` del redirect, muestra éxito/pendiente/falla, **limpia el carrito solo si no falló**, y aclara que el estado real lo confirma el webhook

## Definition of Done

- [x] Suite 15/15: orden pending + items con snapshot (precio de DB verificado por SQL, costo snapshoteado, zona snapshoteada), **preferencia MP sandbox REAL con initPoint válido**, 401/400/400/400, envío gratis aplicado, orderNumber secuencial, **stock sin cambios tras el checkout** (se descuenta al pagar — webhook)
- [ ] En navegador: flujo hasta la pantalla de pago de MP — se verifica junto con la E2E (tarea 9)
- [x] Ruta en `/docs`; `tsc --noEmit` limpio en backend y frontend
