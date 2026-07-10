# Tarea 1 — Resend + plugin de email (con modo degradado)

**Estado:** ⬜ Pendiente
**Depende de:** — (cuenta externa: usuario)

## Objetivo

Emails transaccionales al comprador en los cambios de estado del pedido. Con modo degradado: sin API key, se loguea en vez de enviar (dev no se rompe, y la fase se puede desarrollar entera antes de tener la cuenta).

## Pasos

### Usuario

- [ ] Cuenta gratis en https://resend.com (100 emails/día gratis) → **API Key** → `RESEND_API_KEY` en `.env.local`
- [ ] En dev se envía desde `onboarding@resend.dev` (dominio de prueba de Resend, solo manda a tu propio email verificado — suficiente para la verificación). El dominio propio queda para producción.

### Backend

- [ ] `env.ts`: `RESEND_API_KEY` opcional
- [ ] `backend/src/lib/email.ts` — REST directo a Resend (sin SDK, patrón MP): `sendEmail({ to, subject, html })`; sin API key → `log.info` del contenido y listo (modo degradado)
- [ ] Plantilla simple de cambio de estado: nombre de la tienda, número de pedido, estado nuevo (en español), tracking si hay, total

## Definition of Done

- [ ] Con `RESEND_API_KEY`: un email de prueba llega a tu casilla (verificado a mano con un script one-off)
- [ ] Sin la key: el envío se loguea con el contenido completo y no rompe nada
- [ ] `tsc --noEmit` limpio
