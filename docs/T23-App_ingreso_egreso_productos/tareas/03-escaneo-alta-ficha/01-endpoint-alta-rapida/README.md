# Tarea 1 — Endpoint `POST /admin/products/alta-rapida`

**Estado:** ✅ Hecha (2026-08-17) — suite `t23-04-alta-rapida.mjs` 15/15 PASS
**Depende de:** Fase 01 (columna `barcode` en `productVariants`)

## Objetivo

Dar de alta un producto nuevo (producto + variante) como una sola operación atómica, para que un fallo a mitad de camino nunca deje un producto sin variante — el riesgo real que tenía el diseño original de tres llamadas separadas. Mismo patrón que `venta-local` (Fase 1).

## Pasos

- [x] Schema Zod nuevo `altaRapidaSchema` en `packages/shared/src/schemas/product.ts` — `{ categoryId, name, brand?, price, talle, color, barcode }`. **`stockLocal` no es un campo del input** — se fija en `1` del lado del servidor.
- [x] Endpoint `POST /admin/products/alta-rapida` (`backend/src/modules/products/routes.ts`), con `requireAdminAuth` + `requireOrgId`:
  - [x] Valida `categoryId` con `assertCategoryInOrg` (reusada, ya existía en el módulo).
  - [x] Una sola `db.transaction`: inserta `product` (`visibleInCatalog: false` fijo, resto en sus defaults) + `productVariant` (`stockLocal: 1` fijo, `barcode` del input).
  - [x] `barcode` duplicado en la organización → 409 `conflict`, nada queda escrito (rollback).
  - [x] Documentado en Swagger.

## Bug real encontrado y corregido (no solo en esta tarea — afectaba también a `venta-local` de la Fase 1)

Detectar la violación de unicidad de Postgres comparando `err.code === "23505"` **no funcionaba**: Drizzle envuelve el error real de `postgres` en un `DrizzleQueryError`, y el código queda en `err.cause.code`, no en `err.code` directo. El primer intento de probar el 409 de `barcode` duplicado devolvió un 500 `internal` en vez de 409 — confirmado con los logs del backend (`caused by: PostgresError: duplicate key value violates unique constraint...`).

Se agregó un helper `isUniqueViolation(err)` en `backend/src/lib/errors.ts` que chequea ambas ubicaciones (`err.code` y `err.cause?.code`), y se corrigió en los 3 lugares que tenían el mismo patrón roto:
- El 409 nuevo de `alta-rapida` (esta tarea).
- El retry por colisión de `orderNumber` en `POST /admin/orders/venta-local` (Fase 1) — nunca se había disparado en las pruebas porque una colisión real de concurrencia es rara, así que el bug quedó latente sin detectar hasta ahora.
- El mismo retry en el alta manual de pedidos (`POST /admin/orders`, T7) — código preexistente de antes de este ticket, con el mismo bug; se corrigió de paso al encontrarlo, es el mismo archivo y el mismo fix de una línea.

Re-verificado después del fix: `t23-04-alta-rapida.mjs` (15/15) y `t23-03-venta-local.mjs` (25/25, para confirmar que el fix compartido no rompió nada de la Fase 1).

## Definition of Done

- [x] Alta válida → 201, `product.visibleInCatalog === false`, `variant.stockLocal === 1`, `variant.barcode` correcto, `variant.productId === product.id`.
- [x] `categoryId` inexistente → 400, nada creado (verificado por conteo de filas).
- [x] `categoryId` de otra organización → 400.
- [x] `barcode` duplicado dentro de la misma organización → 409 `conflict` (tras el fix de `isUniqueViolation`), sin producto ni variante nuevos — verificado por conteo de filas antes/después, no solo por el código HTTP.
- [x] Mismo `barcode` en **otra** organización → 201, permitido (unicidad es por org).
- [x] Sin token → 401.
- [x] Ruta en `/docs` — verificado directo contra `/docs/json` (`paths['/admin/products/alta-rapida'].post`, summary correcto); `tsc --noEmit` limpio.
- [x] Verificado con `backend/t23-04-alta-rapida.mjs` (15/15 PASS) contra el backend levantado con `docker compose up -d backend` — datos de prueba limpiados al final.
- [x] Errores de validación (falta `categoryId`, `price` negativo) → 400 `validation`, no 500.
- [x] **`POST /admin/orders` (T7, alta manual de pedidos — la usa hoy el panel de escritorio real) sigue funcionando después de tocar su lógica de retry** — probado end-to-end con un pedido bespoke: 201, `orderNumber` asignado, `total` y `status` correctos. Importante porque el fix de `isUniqueViolation` tocó código de producción ya en uso, no solo código nuevo de esta tarea.

## Dependencias

- **La bloquean**: Fase 01 (columna `barcode` y su constraint de unicidad) — ya resuelta.
- **Bloquea**: Tarea 3 (`03-alta-producto`) de esta fase — es el endpoint que ese formulario llama.
