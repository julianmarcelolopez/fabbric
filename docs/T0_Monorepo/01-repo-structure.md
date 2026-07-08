# Tarea 1 — Estructura base del monorepo

**Estado:** ✅ Hecha (2026-07-06)
**Depende de:** —

## Objetivo

Dejar el repo git inicializado con la estructura de carpetas y el `package.json` raíz con workspaces, antes de meter código adentro de cada paquete.

## Pasos

- [x] `git init` en `C:\projects\fabbric` (hoy no es un repo git)
- [x] Crear `package.json` raíz:
  ```json
  {
    "name": "fabbric",
    "private": true,
    "workspaces": ["frontend", "backend", "packages/*"]
  }
  ```
- [x] Crear carpetas vacías: `backend/`, `frontend/`, `packages/shared/` (con `.gitkeep` para que git las trackee)
- [x] Crear `.gitignore` en la raíz: `node_modules`, `dist`, `.env`, `.env.local`

## Definition of Done

- [x] `git status` muestra el repo inicializado
- [x] Existen `backend/`, `frontend/`, `packages/shared/` en la raíz
- [x] `package.json` raíz tiene el campo `workspaces` correcto
- [x] `.gitignore` cubre `node_modules`, `dist`, `.env`, `.env.local`

## Notas de ejecución (2026-07-06)

- Se encontraron carpetas vacías no previstas en la raíz (`fabbric-catalog/`, `fabbric-dashboard/`, `fabbric-service/`, `supabase/migrations/`) — el usuario confirmó borrarlas y seguir la estructura del plan (un solo `frontend/` SPA, migraciones en `backend/src/db/migrations`).
- Sin commit todavía — el primer commit se hace al cerrar T0 (ver tarea 7).
