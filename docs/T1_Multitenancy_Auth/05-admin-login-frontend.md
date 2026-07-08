# Tarea 5 — Login del Portal Admin (frontend)

**Estado:** ✅ Hecha (2026-07-07) — verificada en navegador por el usuario
**Depende de:** [04-seed-y-endpoints.md](04-seed-y-endpoints.md)

> **Google diferido a T6**: esta tarea implementa solo email/password. El botón de Google y sus casos (403 de usuario Google sin invitación, redirect OAuth) se agregan en T6 junto con la tarea 1 diferida.

## Objetivo

Que un vendedor pueda entrar a `/admin` logueándose con email/password o con Google, que el SPA mantenga la sesión, y que las llamadas al backend viajen con el JWT para que `/admin/me` muestre su organización.

## Pasos

- [x] `frontend/src/features/admin/pages/LoginPage.tsx`:
  - Form email/password → `supabase.auth.signInWithPassword`
  - ~~Botón "Continuar con Google"~~ → diferido a T6 (comentario marcando el lugar)
  - Error genérico "Email o contraseña incorrectos" (sin filtrar si el email existe); redirige a `/admin` si ya hay sesión
- [x] Estado de sesión: `AuthContext.tsx` sobre `getSession` + `onAuthStateChange`, con flag `loading` para no flashear contenido
- [x] Guard de rutas: `RequireAuth.tsx` — sin sesión redirige a `/admin/login`
- [x] Helper de API (`frontend/src/lib/api.ts`): adjunta `Authorization: Bearer <access_token>` de la sesión actual
- [x] Shell mínimo (`AdminHomePage.tsx`): muestra email, role y nombre de la org + logout. **Decisión tomada**: el nombre de la org viene en `GET /admin/me` (campo `orgName`, join en el backend) — una sola llamada.
- [x] Caso 403: pantalla "Sin acceso" + logout; caso 401 (sesión vencida): signOut + redirect a login sin loop

## Definition of Done

Verificado por terminal (2026-07-07): `/admin/me` responde con `orgName: "Demo"` para el owner; Vite compila y sirve los módulos nuevos; typecheck limpio en frontend y backend.

Verificado en navegador por el usuario (2026-07-07):
- [x] Login con email/password del owner del seed → entra a `/admin` y ve su email + org "Demo" con rol owner
- [x] Refrescar la página mantiene la sesión; logout la cierra y vuelve al login
- [x] `/admin` sin sesión redirige a login (no flashea contenido protegido)
- [x] Consola del navegador sin errores (cierra también el pendiente arrastrado de T0)

## Notas

- Cuando en T6 se habilite Google: el login con Google crea el usuario en Supabase Auth automáticamente aunque no sea admin — el caso 403 de esta tarea es el que lo contiene. Usar tu email real en el seed para poder probar ambos métodos con el mismo admin (Supabase linkea por email verificado).
