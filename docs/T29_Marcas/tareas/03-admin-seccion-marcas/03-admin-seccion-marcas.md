# Tarea 3 — Admin web: sección Marcas + combo en ficha de producto

**Estado:** ✅ Hecha — verificada con Playwright real (11/11 PASS).

**Depende de:** Tarea 2 (`/admin/brands` tiene que existir).

## Objetivo (según `plan.md`, T29/03)

El admin puede dar de alta/editar/borrar marcas desde una pantalla propia, y
elegirlas desde un combo (con alta inline) al cargar o editar un producto —
sin escribir ningún componente nuevo para la lista de marcas, reusando
`TaxonomyManager` (`../../analisis.md` sección 4).

## Pasos

### 1. Tab "Marcas" en Productos

- [x] `ProductsPage.tsx` — `"marcas"` sumado a `Tab` y a `TABS`, entre Colecciones y Stock.
- [x] `tab === "marcas"` → `<TaxonomyManager title="Marcas" endpoint="/admin/brands" noun="marca" hideTitle />` — sin componente nuevo.

### 2. Tipos

- [x] `Taxonomy` reusado tal cual para marcas, sin cambios.
- [x] `ProductBase.brand: string | null` → `brandId: string | null`. `brandName: string | null` sumado a `ProductListItem` y `ProductDetail` (resuelto server-side, sin segundo fetch).
- [x] `SUGGESTED_BRANDS` borrado.

### 3. Combo con alta inline en la ficha de producto

- [x] **Decisión de implementación**: no se construyó un componente de combobox nuevo — se extendió el mismo patrón `<input list="..."> + <datalist>` que ya usaba el campo (antes con `SUGGESTED_BRANDS` hardcodeado, ahora con `GET /admin/brands` real). Es la opción más simple dado que el proyecto no tiene ninguna librería de combobox y el datalist nativo ya resolvía "escribir o elegir de una lista" — la única pieza nueva es que el texto tipeado, si no matchea, **crea la marca de verdad** al guardar (antes no hacía nada, era solo cosmético).
- [x] `form.brand: string` → `form.brandName: string` (texto tipeado/elegido). Al guardar, **siempre** viaja como `newBrandName` (nunca se resuelve el id en el cliente) — `resolveBrandId` en el backend ya decide por slug si reusa una marca existente o crea una nueva, así que no hace falta duplicar esa lógica en el frontend.
- [x] Tras guardar, se refresca la lista de marcas (`GET /admin/brands`) para que una marca creada al vuelo aparezca en el datalist sin recargar la página.
- [x] Preview en vivo (`ProductDetailView`) actualizado a `form.brandName`.

### 4. Listado de productos

- [x] `ProductsPage.tsx` (tabla de `ProductsList`) — nueva columna "Marca" (`p.brandName ?? "—"`), entre Nombre y Categoría.
- [x] `MyStorePage.tsx` (preview de secciones del home) — `p.brand` → `p.brandName` (roto por el cambio de tipo, no estaba en el inventario original de la Tarea 3 pero es el mismo `ProductListItem`).

## Cómo se verificó

**Playwright real** (`frontend/t29-03-admin-marcas.mjs`, viewport 1280×900, mismo patrón de org/usuario descartables que `t25-06-admin-factura.mjs` — no toca datos de Eliathi, limpia todo al final):

1. Login real → tab Marcas → crear una marca por UI → `POST /admin/brands` 201 → aparece en la tabla → existe en la DB.
2. Ficha de producto 1: escribir el nombre de la marca YA existente en el combo → guardar → `PATCH` 200 → `products.brand_id` correcto → **no se creó una fila duplicada** en `brands` (mismo slug, 1 sola fila).
3. Ficha de producto 2: escribir un nombre que NO existe (alta inline) → guardar → `PATCH` 200 → se creó la marca nueva en la DB → el producto quedó enlazado a esa marca.
4. Volver al tab Marcas → la marca creada por alta inline ya aparece, sin recargar nada a mano.
5. Cleanup: 0 filas huérfanas al terminar.

**11/11 PASS.** Además, `npx tsc --noEmit` limpio en `backend/` y `frontend/` (0 errores en ambos).

**Hallazgo durante la verificación (no relacionado a marcas)**: la primera corrida del script falló al limpiar — `organizations` tiene una FK desde `catalog_configs`, y una org nueva sin ese registro se lo crea sola en el primer load del admin (`AdminLayout`/`MyStorePage`). El script de verificación no lo tenía en su `cleanup()`; se corrigió ahí (no es un bug de la app, es un detalle del script de prueba).

## Definition of Done

- [x] Tab "Marcas" en Productos, funcional (alta/edición/logo/borrado), sin ítem nuevo en el menú lateral (`AdminLayout.tsx` no se tocó).
- [x] El campo Marca de la ficha de producto es un combo con alta inline, no más texto libre.
- [x] `SUGGESTED_BRANDS` y el `<datalist>` viejo ya no existen en el código.

## Dependencias

- **La bloquean:** Tarea 2.
- **Bloquea:** nada de T29 (Tareas 5 y 6 son independientes de esta, tocan backend público y storefront).
