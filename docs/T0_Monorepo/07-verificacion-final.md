# Tarea 7 — Definition of Done de T0

**Estado:** ✅ Hecha (2026-07-07) — con el primer commit diferido por decisión del usuario
**Depende de:** tareas 1 a 6

## Objetivo

Confirmar que toda la Fase 0 (`docs/plan.md`) está cerrada antes de pasar a T1, con una corrida limpia de punta a punta.

## Checklist final

- [x] `curl http://localhost:4000/health` devuelve `{ ok: true }` (verificado contra los contenedores de Docker)
- [x] `http://localhost:5173` carga en el navegador sin errores de consola (verificado por el usuario durante T1 tarea 5)
- [x] `npx drizzle-kit push` (desde `backend/`) creó las tablas `organizations` y `admin_users` en el proyecto Supabase de dev
- [x] `docker compose up --build` levanta ambos servicios sin error
- [x] `.env.example` sin secretos reales; `.env.local` existe local y git lo ignora
- [ ] El repo tiene un primer commit con la estructura completa del monorepo — **diferido por decisión del usuario** (T0 y T1 completas sin commit aún; hacerlo cuando lo pida)

## Próximo paso

**T1 — Multi-tenancy + Auth admin** (`docs/plan.md`, Fase 1): crear una organización real, alta de `admin_users` con roles, login email/password y Google, resolución de `orgId` en el plugin de auth.
