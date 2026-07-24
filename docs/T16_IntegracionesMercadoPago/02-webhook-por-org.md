# Tarea 2 — Webhook por org + checkout con token de la org

**Estado:** ⬜ Pendiente
**Depende de:** [01-schema-y-tokens.md](01-schema-y-tokens.md)

## Objetivo

Que el cobro y la confirmación de pago de una org con Mercado Pago propio usen SU token y SU secreto, sin romper a las orgs que siguen en el token de plataforma.

## Pasos

- [ ] `backend/src/modules/payments/webhook.ts`: nueva ruta `/webhooks/mercadopago/:slug` (mantener `/webhooks/mercadopago` global tal cual está, para las orgs sin configuración propia).
- [ ] Con `:slug` en la URL, resolver la org **antes** de validar la firma; usar `catalogConfigs.mpWebhookSecret` de esa org si existe, si no, fallback a `MP_WEBHOOK_SECRET` de plataforma.
- [ ] La consulta del pago real (`getPayment`, en `backend/src/modules/payments/service.ts`) debe usar `catalogConfigs.mpAccessToken` de esa org si existe, si no, `MP_ACCESS_TOKEN` de plataforma.
- [ ] `createPreference` (mismo archivo): idéntico criterio — token de la org si está configurado, si no, el de plataforma. Esto significa que el checkout público (`payments/routes.ts`) tiene que resolver y pasar el token correcto según la org del pedido.
- [ ] Revisar que el resto de la lógica del webhook (idempotencia, verificación de firma HMAC, actualización de `orders`/`stock_movements`) no cambie de comportamiento — el único cambio es **de qué org sale el secreto/token a usar**.

## Definition of Done

- [ ] `tsc --noEmit` limpio en `backend`.
- [ ] Prueba con firma HMAC real: una org SIN configuración propia sigue validando con el secreto de plataforma exactamente como antes (no debe romperse el flujo actual de T6/T9).
- [ ] Prueba con una org con `mpAccessToken`/`mpWebhookSecret` de una cuenta de prueba de Mercado Pago: la preferencia se crea con ese token, y una notificación firmada con ese secreto en `/webhooks/mercadopago/:slug` se valida correctamente.
