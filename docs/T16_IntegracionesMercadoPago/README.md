# T16 — Integraciones: Mercado Pago propia de Edgar (`docs/plan_2.md`, demo Eliathi Modas)

## Objetivo de la fase

Que Edgar pueda conectar su propia cuenta de Mercado Pago para que los cobros de su tienda entren a SU cuenta, no a la de la plataforma — sin construir el flujo OAuth completo (eso queda fuera de esta demo, ver `docs/plan_2.md`).

Criterio de verificación (de `docs/plan_2.md`): *con el access token + webhook secret de una cuenta de prueba de Mercado Pago pegados en Integraciones, una compra en esa org pega en `/webhooks/mercadopago/:slug`, valida con el secreto de esa org, y la preferencia se crea con el token de esa org. Una org que NO configuró nada sigue funcionando igual que hoy*.

## Decisiones que marcan esta fase — el porqué del diseño

Hoy hay un único secreto de plataforma (`MP_WEBHOOK_SECRET`, en `.env`) que valida la firma de **todas** las notificaciones que llegan a `/webhooks/mercadopago`, sin importar la org. Si Edgar usa su propia cuenta de Mercado Pago, su secreto de webhook es distinto — y para saber qué secreto usar hay que saber primero de qué org es la notificación, lo cual normalmente recién se sabe *después* de validar la firma (problema de huevo y gallina).

**Se resuelve dándole a cada org su propia URL de webhook** — la URL ya identifica la org, antes de validar nada:

- **Enfoque elegido: token pegado a mano + URL de webhook por org.** Edgar entra al panel de Desarrolladores de Mercado Pago **con su propia cuenta**, genera su access token y su webhook secret, y los pega en la tab Integraciones. Copia la URL de webhook que le mostramos (`/webhooks/mercadopago/<slug>`) a la config de notificaciones de SU aplicación de Mercado Pago.
- **Explícitamente NO se construye OAuth/modo marketplace** en esta demo — eso implicaría un flujo de conexión sin fricción (botón, redirect, sin copiar nada) pero requiere mucho más trabajo (redirect/callback/refresh tokens) y posiblemente aprobación de Mercado Pago como marketplace. Queda anotado en "Fuera de alcance" de `docs/plan_2.md`.
- **Fallback siempre disponible**: una org que no configura nada propio sigue cobrando con el token de plataforma, exactamente como funciona hoy — esta fase no puede romper el comportamiento actual para ninguna otra org.
- **El token nunca se devuelve completo** desde el GET admin, solo enmascarado — y se guarda cifrado.
- Depende de **T15** porque la tab Integraciones se monta sobre el shell de tabs que arma esa fase.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-schema-y-tokens.md](01-schema-y-tokens.md) — columnas cifradas en `catalog_configs`, migración, PATCH/GET enmascarado | T15 | ⬜ Pendiente |
| 2 | [02-webhook-por-org.md](02-webhook-por-org.md) — ruta `/webhooks/mercadopago/:slug`, resolución de secreto/token por org, `createPreference`/`getPayment` con fallback | 1 | ⬜ Pendiente |
| 3 | [03-tab-integraciones-ui.md](03-tab-integraciones-ui.md) — formulario, URL de webhook a copiar, botón desconectar | 1 | ⬜ Pendiente |
| 4 | [04-verificacion-final.md](04-verificacion-final.md) — Definition of Done de T16 | 1-3 | ⬜ Pendiente |

## Recordatorios operativos

- Migración: mismo procedimiento que las anteriores (`db:generate` + `db:migrate`, nunca `db:push`). Si se hace en la misma sesión que T14 (que también agrega columnas a `catalog_configs`), evaluar si conviene combinar migraciones.
- **Cifrado**: definir con qué mecanismo se cifran `mpAccessToken`/`mpWebhookSecret` en reposo antes de empezar la tarea 1 — no guardar en texto plano.
- Documentar (fuera del código, como instructivo para Edgar) los pasos que tiene que hacer él en el panel de Desarrolladores de Mercado Pago: crear su aplicación, copiar el access token, configurar la URL de notificaciones con el secreto que MP le genera.
- Probar con una **cuenta de prueba** de Mercado Pago (no la cuenta real de Edgar) antes de dar la fase por cerrada.

## Próximo paso al cerrar T16

Sigue **T17 — Verificación final de la demo**, que depende de todas las fases anteriores.
