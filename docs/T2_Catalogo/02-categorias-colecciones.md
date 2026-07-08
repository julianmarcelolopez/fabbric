# Tarea 2 — CRUD de categorías y colecciones

**Estado:** ✅ Hecha (2026-07-07)
**Depende de:** [01-schema-catalogo.md](01-schema-catalogo.md)

## Objetivo

Endpoints admin para gestionar las dos taxonomías, scoped por tenant vía `requireOrgId`. Son estructuralmente idénticas (patrón visto en bordart) — misma forma de handler, dos tablas.

## Pasos

- [x] `backend/src/modules/categories/routes.ts` (todas con `preHandler: requireAdminAuth` + `requireOrgId`):
  - `GET /admin/categories` — lista de la org, ordenada por `sortOrder`
  - `POST /admin/categories` — crea (valida con `createCategorySchema`; slug duplicado en la org → 409)
  - `PATCH /admin/categories/:id` — edita (name/slug/active/sortOrder; body vacío → 400)
  - `DELETE /admin/categories/:id` — **bloquea si hay productos** (400 `category_in_use` con mensaje claro)
- [x] `backend/src/modules/collections/routes.ts` — ídem, con `DELETE` libre (el m2m cae por cascade)
- [x] Los `:id` de otra org → **404** (el WHERE siempre incluye `orgId`)
- [x] Registrar rutas en `index.ts`

## Definition of Done

- [x] CRUD completo verificado por HTTP con token real del owner de `demo` (15/15 PASS)
- [x] Slug duplicado → 409; body inválido → 400 `validation`
- [x] Delete de categoría con producto → 400 `category_in_use` (probado con insert directo); sin productos → 200
- [x] **Aislamiento**: staff de una org temporal vio lista vacía y recibió 404 en PATCH/DELETE sobre ids de `demo` (datos temporales limpiados)
- [x] `tsc --noEmit` limpio

## Notas de ejecución (2026-07-07)

- Gotcha de testing (no del servidor): Fastify responde 400 a requests con `Content-Type: application/json` y body vacío — los DELETE en tests van **sin** ese header.
- El PATCH con body `{}` se rechaza explícitamente con 400 antes de llegar a Drizzle (que tira su propio error críptico con `.set({})`).
