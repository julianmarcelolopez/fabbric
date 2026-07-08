# Tarea 6 — Definition of Done de T1

**Estado:** ✅ Hecha (2026-07-07)
**Depende de:** tareas 1 a 5

## Objetivo

Cerrar la Fase 1 con una corrida completa de punta a punta, cubriendo el criterio del plan: *crear org + admin owner, login email/password y Google, `orgId` resuelto correctamente*.

## Checklist final

Flujo completo desde cero (con los contenedores de Docker corriendo):

- [x] `npm run db:seed` reproducible: org + owner + (con flag) super_admin, idempotente (verificado con doble corrida en la tarea 4)
- [x] Login email/password en `/admin` → shell con email, role y org correctos (verificado en navegador por el usuario)
- [x] ~~Login con Google~~ → diferido a T6 junto con la tarea 1 (el criterio de la fase se cumple con email/password)
- [x] `GET /admin/me` sin token → 401; con token de no-admin → 403; con token válido → 200 con `orgId` correcto (tareas 3-4, tokens reales)
- [x] `GET /superadmin/organizations` con owner → 403; con super_admin → 200 (tarea 4)
- [x] Segunda organización + admin propio → su `/admin/me` devolvió el `orgId` de SU org (≠ demo) — multi-tenancy probado con dos tenants conviviendo (tarea 4, con org temporal limpiada después)
- [x] Consola del navegador limpia en login y shell de admin (usuario)
- [x] `tsc --noEmit` limpio en backend, frontend y shared
- [x] Todo verificado corriendo contra los contenedores de `docker compose up` (los tests HTTP de las tareas 3-5 apuntaron siempre al backend en Docker)

## Al cerrar

- Actualizar la tabla de estado en el README de esta carpeta
- Si el usuario lo pide: primer commit del repo (pendiente arrastrado de T0) o commit de cierre de T1
- Siguiente fase: **T2 — Catálogo base** (`docs/plan.md`, Fase 2) — armar `docs/T2_Catalogo/` con el mismo formato antes de arrancar
