# Tarea 2 — Endpoints admin de secciones del home

**Estado:** ✅ Hecha (2026-07-08) — suite 20/20 PASS
**Depende de:** [01-schema-home-sections.md](01-schema-home-sections.md)

## Objetivo

CRUD + reorder de `home_sections`, y la respuesta enriquecida que alimenta tanto la página de administración como el preview en vivo: cada sección con el nombre de su ref y sus productos resueltos.

## Pasos

`backend/src/modules/homeSections/routes.ts` (todas con `requireAdminAuth` + `requireOrgId` + `schema` Swagger):

- [x] `GET /admin/home-sections` — lista ordenada, cada ítem con `refName`/`refSlug`/`refActive` resueltos + `products` (hasta 8 visibles con id/name/price/imageUrl); refs borrados → `refName: null` (el renderer los saltea)
- [x] `POST /admin/home-sections` — 400 `invalid_ref` si el ref no existe en la org (incluye tipo cruzado: id de colección con refType category); duplicado → 409; `sortOrder` al final
- [x] `PATCH /admin/home-sections/:id` — toggle `visible`
- [x] `PUT /admin/home-sections/order` — set exacto o 400 `invalid_section_set`
- [x] `DELETE /admin/home-sections/:id`
- [x] DELETE de `categories` y `collections` limpia sus filas de `home_sections` en transacción
- [x] Registrado en `index.ts`

## Definition of Done

- [x] Suite HTTP 20/20 PASS con los datos reales de T2 (remeras/verano-2027/ofertas): alta de ambos tipos, lista con nombres y productos resueltos (precio + imagen del producto real), reorder intercalado persistido, toggle, 409/400/400
- [x] Borrar una colección que estaba en el home eliminó su sección (verificado por DB)
- [x] **Aislamiento**: staff de otra org — lista vacía, 404 en PATCH y DELETE
- [x] Las 3 rutas en `/docs` (verificado contra el spec JSON)
- [x] `tsc --noEmit` limpio

## Notas de ejecución (2026-07-08)

- La suite usa el catálogo real cargado por el usuario en T2 y lo deja intacto; las secciones de prueba se limpian (el usuario arma su home real en las tareas 3-5).
