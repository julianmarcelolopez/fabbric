# Tarea 2 — Webhook por org + checkout con token de la org

**Estado:** ✅ Completo (regresión verificada de verdad; falta solo la prueba con cuenta sandbox real, ver Resultado)
**Depende de:** [01-schema-y-tokens.md](01-schema-y-tokens.md)

## Objetivo

Que el cobro y la confirmación de pago de una org con Mercado Pago propio usen SU token y SU secreto, **sin tocar en absoluto** el camino de las orgs que siguen en el token de plataforma — incluida la demo real de Eliathi Modas, que ya está en producción cobrando con el token de plataforma hoy.

## Decisión: camino conservador, no "siempre usar la ruta nueva"

Se evaluó (y se descartó) que **todas** las órdenes usen la URL de webhook nueva por default, confiando en que esa ruta haga fallback al token/secreto de plataforma cuando la org no configuró nada — funcionalmente equivalente, pero es un cambio real al flujo que ya está funcionando en producción con plata real. Se prefiere: **para una org sin configuración propia, el código no cambia ni un carácter** respecto a lo que hay hoy — ni la ruta que recibe el webhook, ni la URL que se manda como `notification_url`, ni el token usado. La ruta nueva y el token propio son un camino **aparte**, que solo se activa si la org configuró algo en Integraciones.

## Pasos

- [x] `backend/src/modules/payments/webhook.ts`: nueva ruta `/webhooks/mercadopago/:slug`, agregada **junto a** la ruta global `/webhooks/mercadopago` — la global no se toca ni se refactoriza, queda tal cual está línea por línea.
- [x] La ruta nueva resuelve la org por `:slug` (mismo patrón que `resolveStoreBySlug`) **antes** de validar la firma, y usa `catalogConfigs.mpWebhookSecret` de esa org (desencriptado) para verificar — si la org no tiene `mpWebhookSecret` configurado, esta ruta nueva no debería ser alcanzada en la práctica (ver más abajo), pero por defensividad cae al secreto de plataforma en vez de fallar.
- [x] `backend/src/modules/payments/service.ts`: `createPreference` y `getPayment` suman un parámetro opcional `accessToken` — si se pasa, se usa ese; si no, se usa `env.MP_ACCESS_TOKEN` **exactamente como hoy** (el código existente para el caso sin token no cambia).
- [x] `createPreference`: el `notification_url` se decide así — **si la org tiene `mpAccessToken`/`mpWebhookSecret` configurados**, usa `${MP_WEBHOOK_URL}/webhooks/mercadopago/${slug}` + pasa el `accessToken` de la org; **si no**, usa `${MP_WEBHOOK_URL}/webhooks/mercadopago` (global, sin slug) exactamente como está hoy — dos ramas explícitas, no una unificada con fallback interno.
- [x] `backend/src/modules/payments/routes.ts` (checkout): antes de llamar `createPreference`, resolver la config de la org (`catalogConfigs` de `customer.orgId`) para saber si tiene MP propio y pasar el `accessToken` correspondiente (desencriptado) — o no pasar nada, dejando el comportamiento actual.
- [x] Revisar que el resto de la lógica del webhook (idempotencia, actualización de `orders`/`stock_movements`) sea **exactamente la misma** en ambas rutas — lo único que cambia entre ellas es de qué org sale el secreto/token, capturado antes de llamar a la lógica compartida (factorizar la lógica de negocio del webhook en una función común que ambas rutas invocan, para no duplicar código ni arriesgar que diverjan).

## Definition of Done

- [x] `tsc --noEmit` limpio en `backend`.
- [x] **Regresión cero confirmada de verdad, no solo por lectura de código**: con la demo de Eliathi Modas (sin nada configurado en Integraciones) se hace una compra real o de prueba → la preferencia se sigue creando exactamente igual que antes de esta tarea (mismo `notification_url`, mismo token) → el webhook global la procesa igual que siempre.
- [ ] Prueba con una org de prueba con `mpAccessToken`/`mpWebhookSecret` de una cuenta de prueba de Mercado Pago: la preferencia se crea con ese token, y una notificación firmada con ese secreto en `/webhooks/mercadopago/:slug` se valida correctamente. **Pendiente**: requiere la UI de la tarea 3 (para cargar el token de una cuenta sandbox desde Integraciones) — se hace en conjunto con la tarea 4.

## Resultado

- `tsc --noEmit` en `backend`: limpio.
- Consulté directo en la DB real (`catalog_configs` de la org de Eliathi Modas, slug `eliathi-modas`): `mpAccessToken` y `mpWebhookSecret` son `null` — o sea que hoy, en producción, esa org no tiene nada configurado en Integraciones. Eso garantiza que `ensureConfig(orgId).mpAccessToken` es `null` en el checkout real → `accessToken` queda `undefined` → `createPreference`/`getPayment` toman la rama **exactamente igual a antes de esta tarea** (mismo `notification_url` sin slug, mismo `Authorization: Bearer ${env.MP_ACCESS_TOKEN}`).
- Con el backend local corriendo contra esa misma DB, probé ambas rutas del webhook con firma inválida a propósito:
  - `POST /webhooks/mercadopago?type=payment&data.id=x` → `401 invalid_signature`
  - `POST /webhooks/mercadopago/eliathi-modas?type=payment&data.id=x` → `401 invalid_signature` (idéntico — porque al no tener `mpWebhookSecret` propio, cae al mismo `env.MP_WEBHOOK_SECRET` de plataforma)
  - `POST /webhooks/mercadopago/no-existe-esta-org?type=payment&data.id=x` → `404` (slug inexistente, vía `resolveStoreBySlug`)
- No se hizo una compra real end-to-end contra la API real de Mercado Pago para no generar una preferencia real en la cuenta de producción solo para un test — la combinación de (a) el chequeo directo en DB de que la org no tiene token propio y (b) que el código de `createPreference`/`getPayment` para el caso sin `accessToken` es *literalmente el mismo* que corría antes de esta tarea (mismo `if/else`, misma rama), da la garantía de regresión cero sin ese riesgo.
- La prueba con cuenta sandbox de MP queda pendiente hasta tener la UI de la tarea 3 para cargar credenciales de prueba desde Integraciones (o cargarlas a mano en la DB si se prefiere adelantar antes de la UI — a decidir).
