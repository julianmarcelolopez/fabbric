# Tarea 4 — Seed de org + owner, y endpoints superadmin

**Estado:** ✅ Hecha (2026-07-07)
**Depende de:** [03-auth-plugin.md](03-auth-plugin.md)

## Objetivo

Resolver el problema del primer admin (crear un admin requiere ser admin) con un seed script idempotente, y exponer los endpoints mínimos de gestión de tenants para el rol `super_admin`.

## Pasos

### Cliente Supabase Admin

- [x] `backend/src/lib/supabaseAdmin.ts` — cliente `@supabase/supabase-js` con `SUPABASE_SECRET_KEY` (solo backend; Auth Admin API ahora, Storage en T2). **Desvío del plan**: quedó en `lib/` en vez de `plugins/` porque el seed script lo necesita fuera de Fastify; si alguna ruta futura lo quiere como decorator, se envuelve ahí.

### Seed script

- [x] `backend/scripts/seed.ts` (script npm `db:seed`):
  - Crea la organización de desarrollo (`name`, `slug` — ej. "Demo" / `demo`) si no existe (busca por slug)
  - Crea el usuario en Supabase Auth vía Admin API (`auth.admin.createUser` con `email_confirm: true`) si no existe, con email/password tomados de env o argumentos (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`)
  - Inserta la fila en `admin_users` (`role: 'owner'`, `orgId` de la org creada) si no existe
  - **Idempotente**: correrlo dos veces no duplica nada ni falla
  - Opcional: flag `--super-admin` para crear también un super admin (`orgId: null`)

### Endpoints superadmin (mínimos para esta fase)

- [x] `backend/src/modules/superadmin/routes.ts`, protegidos con `requireSuperAdmin`:
  - `GET /superadmin/organizations` — lista de tenants
  - `POST /superadmin/organizations` — crea tenant (valida con schema Zod de `@fabbric/shared`)
  - `POST /superadmin/organizations/:orgId/admins` — alta de admin (`owner`/`staff`): crea el usuario en Supabase Auth (Admin API) + fila en `admin_users`
- El portal super admin completo (UI) queda fuera del plan — estos endpoints son la base mínima y se prueban por HTTP directo.

## Definition of Done

- [x] `npm run db:seed -- --super-admin` dejó: org `demo`, owner (email real del usuario) y super_admin (`+super`), verificado por la salida del script y los tests
- [x] Segunda corrida del seed: no duplica ni rompe (todo "ya existe")
- [x] Con token de `owner`, `GET /superadmin/organizations` → 403
- [x] Con token de `super_admin`: GET lista (200, contiene `demo`), POST org (201), slug duplicado (409), body inválido (400 `validation`), POST admin staff (201)
- [x] `GET /admin/me` con el owner del seed → 200 con el `orgId` de `demo` — cierra el DoD de la tarea 3
- [x] Bonus (preview de la tarea 6): un staff creado en una **segunda** org vio su propio `orgId` (≠ demo) en `/admin/me` — multi-tenancy funcionando con datos temporales (limpiados después)

## Notas de ejecución (2026-07-07)

- Test integral: 10/10 PASS con tokens reales (password grant) contra el backend en Docker. Los datos temporales del test (org `temp-t4`, staff) se borraron al final; en la DB quedan solo `demo` + los 2 usuarios del seed.
- Credenciales del seed en `.env.local` (`SEED_*`); el super admin usa el mismo Gmail con `+super`.

## Notas

- La password del seed no se hardcodea: por env local o argumento. No commitear credenciales ni siquiera de dev.
- `admin_users.id` = `auth.users.id` (mismo UUID) — el seed debe usar el id que devuelve la Admin API, no generar uno propio.
