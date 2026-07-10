# Tarea 1 — Resend + plugin de email (con modo degradado)

**Estado:** ✅ Hecha (2026-07-10) — email real enviado vía Resend
**Depende de:** — (cuenta externa: usuario)

## Objetivo

Emails transaccionales al comprador en los cambios de estado del pedido. Con modo degradado: sin API key, se loguea en vez de enviar (dev no se rompe, y la fase se puede desarrollar entera antes de tener la cuenta).

## Pasos

### Usuario

- [ ] Cuenta gratis en https://resend.com (100 emails/día gratis) → **API Key** → `RESEND_API_KEY` en `.env.local`
- [ ] En dev se envía desde `onboarding@resend.dev` (dominio de prueba de Resend, solo manda a tu propio email verificado — suficiente para la verificación). El dominio propio queda para producción.

### Backend

- [x] `env.ts`: `RESEND_API_KEY` opcional + `EMAIL_FROM` (default `onboarding@resend.dev`)
- [x] `backend/src/lib/email.ts` — REST directo (sin SDK): `sendEmail` con modo degradado; **si Resend falla, se loguea pero NO rompe el cambio de estado** (el email es efecto secundario, decisión documentada)
- [x] `orderStatusEmail()`: plantilla con textos en español por estado (paid/preparing/shipped/delivered/cancelled), tracking y total formateado
- [x] Script de prueba: `npx tsx scripts/test-email.ts <email>` (sirve para ambos modos)

## Definition of Done

- [x] Con `RESEND_API_KEY`: email real enviado (a la casilla dueña de la cuenta)
- [x] Sin la key: el envío se loguea completo y no rompe nada (verificado)
- [x] Fallo de Resend manejado con gracia (probado de verdad: 403 → warning, sin crash)
- [x] `tsc --noEmit` limpio

## Limitación de Resend en modo test (documentada)

Sin dominio propio verificado, Resend **solo entrega a la casilla dueña de la cuenta** (`julianmarcelolopezdev@gmail.com`). Implicación para T7: los emails a compradores reales (ej. Patricia/lopezazame) van a fallar con 403 y quedar **logueados** — que es exactamente lo que la verificación va a mirar. En producción: verificar dominio en resend.com/domains y cambiar `EMAIL_FROM`.
