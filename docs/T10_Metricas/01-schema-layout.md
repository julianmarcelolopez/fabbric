# Tarea 1 — `dashboard_layout` (migración 0006) + endpoint de guardado

**Estado:** ✅ Completada (2026-07-12)
**Depende de:** —

## Objetivo

El layout del dashboard persistido por usuario: la columna, su schema Zod y el endpoint que lo guarda.

## Pasos

- [ ] `packages/shared/src/schemas/dashboardLayout.ts`: `zoneLayoutSchema` (`{ orden: string[], ocultas: string[] }`), `dashboardLayoutSchema` (`{ stats, paneles }`) — ids como strings libres (forward-compatible: el server no valida contra el set de tarjetas; el cliente ignora ids desconocidos al renderizar)
- [ ] `backend/src/db/schema.ts`: `dashboardLayout: jsonb("dashboard_layout")` **nullable** en `admin_users` (null = layout default) — tipado con `$type<DashboardLayout>()`
- [ ] Migración: `npm run db:generate -- --name dashboard_layout` → revisar SQL → `db:migrate` (session pooler desde el contenedor) → `supabase/migrations/0006_dashboard_layout.sql`
- [ ] `PATCH /admin/dashboard-layout` (módulo `metrics/`): guarda el layout del **admin autenticado** (`request.adminUser.id`, no de la org); devuelve el layout guardado. Swagger
- [ ] `GET /admin/me` pasa a incluir `dashboardLayout` (el Dashboard lo recibe sin llamada extra)

## Definition of Done

- [x] Migración aplicada y versionada (`0006_dashboard_layout.sql` — un solo ALTER TABLE)
- [x] Mini-suite: PATCH guarda y `/admin/me` lo devuelve; el layout de un admin NO pisa el de otro (dos usuarios, dos layouts); body inválido → 400
- [x] `tsc --noEmit` limpio

## Notas de ejecución (2026-07-12)

- Mini-suite **8/8 ✅** (owner y super admin como los "dos usuarios": layouts independientes verificados; el 400 por body inválido no corrompe el layout guardado; cleanup a null).
- El módulo `modules/metrics/` nació con el PATCH; el `GET /admin/metrics/overview` se agrega en la tarea 2.
- `AdminPrincipal` del auth plugin queda chico (id/orgId/email/role) — `/admin/me` lee `dashboardLayout` con su propio select, no se infla cada request.
- La columna jsonb va tipada con `$type<DashboardLayout>()` (el tipo viene de shared — primera vez que `schema.ts` importa del paquete, solo como type).
