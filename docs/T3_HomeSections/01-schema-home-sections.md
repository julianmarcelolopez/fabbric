# Tarea 1 — Tabla `home_sections` + schema Zod

**Estado:** ✅ Hecha (2026-07-08)
**Depende de:** —

## Objetivo

La tabla que persiste la composición del home de cada tienda, y sus schemas compartidos. Primera migración generada bajo el flujo nuevo (`db:generate` + `db:migrate`) después del baseline.

## Pasos

### Drizzle (`backend/src/db/schema.ts`)

- [x] Enum `home_section_ref_type`: `category` | `collection`
- [x] `home_sections` con todos los campos, sin FK en `refId` (polimórfico) y `unique(orgId, refType, refId)`
- [x] `drizzle-kit generate --name home_sections` → SQL revisado antes de aplicar: `supabase/migrations/0001_home_sections.sql`
- [x] `drizzle-kit migrate` aplicado

### Schema Zod (`packages/shared/src/schemas/homeSection.ts`)

- [x] `homeSectionRefTypeSchema`, `homeSectionSchema`, `createHomeSectionSchema`, `updateHomeSectionSchema` ({ visible }), `reorderHomeSectionsSchema`
- [x] Re-export en `index.ts`

## Definition of Done

- [x] Migración `0001_home_sections.sql` versionada y aplicada; tabla + enum verificados por `information_schema`; el registro de `drizzle.__drizzle_migrations` muestra 2 migraciones (baseline + esta) — 5/5 PASS
- [x] Constraint `unique(orgId, refType, refId)` verificada con insert duplicado real (23505) y limpiada
- [x] `tsc --noEmit` limpio en los tres workspaces
