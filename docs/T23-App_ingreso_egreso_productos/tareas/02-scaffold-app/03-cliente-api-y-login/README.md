# Tarea 3 — Cliente de API + Supabase + Login

**Estado:** ✅ Hecha (2026-08-17)
**Depende de:** Tarea 2 (`02-dockerizacion`)

## Objetivo

Que la PWA pueda autenticarse contra el mismo Supabase Auth que ya usa el panel admin, y llamar al backend real con el token de esa sesión — cerrando el scaffold antes de construir pantallas de negocio (Fase 03 del plan general).

## Pasos

- [x] `pwa/src/lib/supabaseClient.ts` — mismo patrón que `frontend/src/lib/supabaseClient.ts`.
- [x] `pwa/src/lib/api.ts` — `apiJson`/`apiUpload` copiados de `frontend/src/lib/api.ts` (se dejó afuera `publicJson`: la PWA no tiene ningún endpoint público que llamar, hubiera quedado código muerto).
- [x] `pwa/.env.example` — mismas 3 variables que `frontend/.env.example`.
- [x] Pantalla de Login (`pwa/src/LoginScreen.tsx`): email/contraseña reales, `supabase.auth.signInWithPassword`, mensaje de error genérico ("Email o contraseña incorrectos", mismo criterio que `frontend/LoginPage.tsx` — no revelar si el email existe). `App.tsx` gatea por sesión (`onAuthStateChange`) y muestra un placeholder con el email logueado + botón de prueba de conexión al backend + cerrar sesión.

## Bugs reales encontrados y corregidos al verificar en navegador (no solo documentación)

1. **CORS bloqueaba la PWA.** El backend solo permitía como origen `FRONTEND_URL` (puerto 5173, el panel admin) — la PWA (5174) quedaba bloqueada al llamar cualquier endpoint (`Access-Control-Allow-Origin` ausente). Se agregó `PWA_URL` como variable de entorno nueva (`backend/src/config/env.ts`, default `http://localhost:5174`) y se sumó a los orígenes permitidos en `backend/src/index.ts`. Documentado en `backend/.env.example`.
2. **Las credenciales de `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` en `backend/.env.local` ya no son válidas** — no es un bug de esta tarea: ese usuario tiene dos providers vinculados (`email` + `google`) y en la práctica se loguea con Google; la contraseña documentada quedó desactualizada. Verificado directo contra Supabase Auth (fuera del navegador) para confirmar que no era un problema de la PWA. **No se tocó la cuenta real** — se verificó el flujo completo con un admin descartable (usuario + organización temporales, creados y borrados solo para esta verificación). Si se quiere loguear con la cuenta real del dueño en la PWA, hace falta actualizar `SEED_ADMIN_PASSWORD` en `backend/.env.local` (o usar el password real que Julian ya conoce, no el que quedó en el archivo).

## Definition of Done

- [x] Con `docker compose up -d backend pwa`: login con un admin válido navega a la pantalla siguiente, mostrando su email — probado en un navegador real (Playwright), no solo con `curl`.
- [x] Credenciales inválidas muestran "Email o contraseña incorrectos" sin romper la app.
- [x] `GET /admin/products` vía `apiJson` responde 200 ("OK — 0 productos") con el token de la sesión — solo después de corregir el bug de CORS de arriba.
- [x] "Cerrar sesión" vuelve a la pantalla de Login.
- [x] Sin errores de consola del navegador fuera de los 400 esperados (el intento de credenciales inválidas).
- [x] `tsc --noEmit` limpio en `pwa` y en `backend` (por el cambio de CORS).
- [x] Variables de entorno no quedan commiteadas.
- [x] Probado en navegador contra el stack dockerizado (`docker compose up -d backend pwa`), con capturas de cada paso.

## Dependencias

- **La bloquean**: Tarea 2 (`02-dockerizacion`).
- **Bloquea**: Fase 03 del plan general (`escaneo-alta-ficha`) — la primera pantalla real de negocio se construye sobre este login y este cliente de API.
