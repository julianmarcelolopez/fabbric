# Tarea 2 — Endpoint `GET /admin/variants/by-barcode/:code`

**Estado:** ✅ Hecha (2026-08-17) — suite `t23-02-by-barcode.mjs` 11/11 PASS
**Depende de:** Tarea 1 (`01-migracion-barcode`)

## Objetivo

Que la pantalla "Escanear" de la PWA pueda resolver, con una sola llamada, si el código leído corresponde a un producto existente (→ Ficha) o no (→ Alta).

## Pasos

`backend/src/modules/variants/routes.ts`:

- [x] `GET /admin/variants/by-barcode/:code` con `requireAdminAuth` + `requireOrgId` (mismo patrón que el resto de `/admin/*`).
- [x] Busca `productVariant` por `barcode = :code` **y** `orgId` del admin autenticado — nunca sin el filtro de org.
- [x] Devuelve la variante junto con: datos del `product` (nombre, marca), `category` (nombre), la primera imagen (`productImages` ordenada por `sortOrder`), y `stockLocal`.
- [x] 404 si no existe, o si existe pero pertenece a otra organización.
- [x] Documentado en Swagger (`tags`/`summary`, igual que las rutas vecinas).

## Definition of Done

- [x] `barcode` existente → 200, con variante + producto + categoría + imagen + `stockLocal` correctos.
- [x] `barcode` inexistente → 404.
- [x] `barcode` que existe pero es de **otra** organización → 404 (no 403).
- [x] Sin token → 401.
- [x] Ruta visible en `/docs`; `tsc --noEmit` limpio (verificado también dentro del contenedor Docker, `docker compose exec backend npx tsc --noEmit`).
- [x] Verificado con `backend/t23-02-by-barcode.mjs` (11/11 PASS) contra el backend levantado con `docker compose up -d backend` — datos de prueba (orgs, admins, categoría, producto, variante, imagen) limpiados al final.
- [ ] Prueba manual en navegador desde la PWA real — pendiente hasta que exista un cliente (Fase 02/03); por ahora verificado server-to-server.

## Dependencias

- **La bloquean**: Tarea 1 (`01-migracion-barcode`).
- **Bloquea**: Fase 03 (`escaneo-alta-ficha`) de la app — es el endpoint que resuelve la rama Alta vs. Ficha.
