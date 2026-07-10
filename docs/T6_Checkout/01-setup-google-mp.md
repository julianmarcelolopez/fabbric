# Tarea 1 — Google OAuth + credenciales de Mercado Pago (manual, usuario)

**Estado:** ✅ Hecha (2026-07-09) — Google ✅ + MP ✅ (queda un micro-paso: crear la cuenta compradora de prueba antes de la E2E de la tarea 9)
**Depende de:** — (dashboards externos)

## Objetivo

Dejar listos los dos servicios externos de la fase: el login con Google (diferido desde T1 — la guía detallada ya existe en `docs/T1_Multitenancy_Auth/01-google-oauth.md`) y las credenciales de test de Mercado Pago.

## Pasos

### Google (guía completa en T1 tarea 1) — ✅ completado 2026-07-08

- [x] Google Cloud Console (UI nueva "Google Auth Platform"): proyecto `fabbric-dev`, app External en Testing con test user, OAuth client Web con la callback de Supabase
- [x] Supabase → Providers → **Google** habilitado con Client ID/Secret
- [x] Supabase → URL Configuration: Site URL `http://localhost:5173`, Redirect URLs `http://localhost:5173/**`

### Mercado Pago — ✅ 2026-07-09

- [x] App `fabbric` creada (Pagos online → Checkout Pro)
- [x] Credenciales de prueba obtenidas. **Gotcha del panel nuevo de MP**: las credenciales de sandbox también empiezan con `APP_USR-` (ya no `TEST-`) — se distinguen por la página "Credenciales de prueba" (URL `/credentials/sandbox`). Verificado por API: `users/me` responde `test_user: true` (TESTUSER674...), imposible tocar dinero real.
- [x] Usuario de prueba VENDEDOR auto-creado por MP (dueño de las credenciales)
- [ ] Cuenta de prueba COMPRADORA (con saldo) — crear en "Cuentas de prueba" antes de la E2E (tarea 9); con ella se paga en el sandbox
- [x] Webhook secret: queda para la tarea 7 (se genera al configurar la URL)

### .env

- [x] `MP_ACCESS_TOKEN` en `.env.local` (verificado contra la API real)
- [x] `.env.example` actualizado con placeholders y la nota del formato nuevo

## Definition of Done

- [x] Provider Google habilitado + redirect URLs (verificado con login real en la tienda — tarea 4)
- [x] `MP_ACCESS_TOKEN` de sandbox en `.env.local`, verificado con `GET /users/me` (`test_user: true`)
