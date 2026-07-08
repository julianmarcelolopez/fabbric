# T1 — Multi-tenancy + Auth admin (Fase 1 de docs/plan.md)

## Objetivo de la fase

Que exista una organización real (tenant), que un vendedor pueda loguearse al Portal Admin con email/password o Google, y que el backend resuelva su `orgId` en cada request validando el JWT de Supabase. Es la base de la que depende todo lo demás: ninguna fase posterior puede scopear datos por tenant sin esto.

Criterio de verificación de la fase (de `docs/plan.md`): *crear org + admin owner, login email/password y Google, `orgId` resuelto correctamente*.

## Decisiones que marcan esta fase

- **Validación de JWT por JWKS, no por secreto compartido**: el proyecto Supabase usa JWT Signing Keys asimétricas (ES256) — decidido en T0 (ver `docs/T0_Monorepo/02-supabase-dev.md`). El backend usa `jose` con `createRemoteJWKSet` contra `https://uhnitagtprwhwpqjwdph.supabase.co/auth/v1/.well-known/jwks.json`.
- **El problema del primer admin se resuelve con un seed script**, no con un endpoint público: crear un admin requiere estar autenticado como admin (huevo y gallina). `backend/scripts/seed.ts` crea la primera org + su owner usando la service key, idempotente.
- **Los usuarios de Supabase Auth se crean desde el backend** (Admin API con service key), nunca por signup público: el alta de un vendedor es una acción de super_admin (o del seed). El signup abierto queda para el portal comprador (T6) y el onboarding self-serve queda post-MVP.
- **Tenant scoping por `WHERE org_id` en el código** (`lib/tenant.ts`), sin RLS todavía — RLS es defensa en profundidad post-MVP (ver hoja de ruta SaaS en `docs/plan.md`). La regla desde ya: **ningún query de negocio sin `orgId`**.
- **`packages/shared` se estrena en esta fase** con los schemas Zod de `organization` y `adminUser` — primer caso real del motivo por el que elegimos monorepo.

## Cómo trabajamos esta carpeta

Igual que `docs/T0_Monorepo`: cada tarea es un archivo con objetivo, pasos y Definition of Done propio. Se ejecutan en orden, una por turno; al cerrarla se marca acá y en el archivo.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-google-oauth.md](01-google-oauth.md) — Google OAuth + config de Auth en Supabase | — | ⏭️ Diferida a T6 |
| 2 | [02-shared-package.md](02-shared-package.md) — Bootstrap de `packages/shared` (schemas Zod) | — | ✅ Hecha |
| 3 | [03-auth-plugin.md](03-auth-plugin.md) — Plugin de auth del backend (JWKS + `requireAdminAuth`) | 2 | ✅ Hecha |
| 4 | [04-seed-y-endpoints.md](04-seed-y-endpoints.md) — Seed de org+owner y endpoints superadmin | 3 | ✅ Hecha |
| 5 | [05-admin-login-frontend.md](05-admin-login-frontend.md) — Login del Portal Admin (frontend) | 4 | ✅ Hecha |
| 6 | [06-verificacion-final.md](06-verificacion-final.md) — Definition of Done de T1 | 2-5 | ✅ Hecha |

La tarea 1 quedó **diferida a T6** (2026-07-07): Google Cloud solo hace falta para el login con Google, el admin funciona con email/password, y en T6 el trámite es obligatorio de todos modos (portal comprador = solo Google). T1 se cierra sin Google; las tareas 2-4 son código backend, la 5 integra el frontend, la 6 cierra la fase.

## Pendientes arrastrados de T0

- **Primer commit del repo** — diferido por decisión del usuario al cierre de T0; hacerlo cuando lo pida (idealmente antes o al cierre de T1 para no acumular demasiado en un solo commit).
- **Chequeo visual de consola del navegador** en `localhost:5173` — se cubre naturalmente en la tarea 5/6 de esta fase.

## Próximo paso al cerrar T1

**T2 — Catálogo base** (`docs/plan.md`, Fase 2): categorías, colecciones (m2m), productos, variantes talle/color, imágenes con upload+reorder, preview a nivel producto.
