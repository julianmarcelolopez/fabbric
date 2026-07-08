# Tarea 3 — CRUD de productos, variantes y asignación a colecciones

**Estado:** ✅ Hecha (2026-07-07)
**Depende de:** [01-schema-catalogo.md](01-schema-catalogo.md), [02-categorias-colecciones.md](02-categorias-colecciones.md)

## Objetivo

El núcleo del catálogo: productos con su categoría, precio, estado y visibilidad; variantes talle/color con stock online/local; y la relación muchos-a-muchos con colecciones.

## Pasos

### Productos (`backend/src/modules/products/routes.ts`)

- [x] `GET /admin/products` — lista de la org con `categoryName`, `variantCount`, colecciones y `firstImageUrl`
- [x] `GET /admin/products/:id` — detalle completo (variantes + imágenes + colecciones) — lo consume el editor y el preview
- [x] `POST /admin/products` — crea (categoryId de otra org o inexistente → 400 `invalid_category`)
- [x] `PATCH /admin/products/:id` — edita campos base (body vacío → 400; categoryId validado)
- [x] `DELETE /admin/products/:id` — cascade a variantes/imágenes/m2m; TODO(T2-04) marcado para limpiar archivos de Storage
- [x] `PUT /admin/products/:id/collections` — reemplaza el set en transacción (ids ajenos → 400 `invalid_collections`)

### Variantes (`backend/src/modules/variants/routes.ts`)

- [x] `POST /admin/products/:id/variants` — crea (talle+color duplicado en el producto → 409)
- [x] `PATCH /admin/variants/:id` — edita (stock, sku, priceOverride); si cambia talle/color valida contra las demás variantes → 409
- [x] `DELETE /admin/variants/:id`
- [x] Comentario en el código: en T4 el cambio de stock por PATCH pasa a registrar un `stock_movement` tipo "ajuste"

## Definition of Done

- [x] Flujo completo por HTTP (18/18 PASS): producto → 2 variantes con stock online/local distinto y priceOverride → 2 colecciones → `GET` detalle y lista reflejan todo
- [x] Variante duplicada (POST y PATCH) → 409
- [x] `categoryId` o `collectionIds` de otra org/inexistentes → 400
- [x] **Aislamiento**: staff de otra org — lista vacía, 404 en detalle, POST de variante y DELETE
- [x] Delete de producto → variantes y m2m desaparecen (verificado por SQL directo)
- [x] `tsc --noEmit` limpio

## Notas de ejecución (2026-07-07)

- Falso negativo durante el test: la primera corrida pegó al proceso viejo mientras tsx reiniciaba el contenedor con el código recién guardado (polling 1s + restart). Ante un FAIL inesperado justo después de editar rutas, reintentar antes de debuggear.
- Datos de prueba limpiados; `demo` quedó vacío de catálogo (los datos "reales" se crean en la tarea 5 desde el navegador).
