# Tarea 4 — PWA: combo de marca en alta por QR

**Estado:** ✅ Hecha — verificada con Playwright real (7/7 PASS).

**Depende de:** Tarea 2 (`/admin/brands` y `alta-rapida` actualizado).

## Objetivo (según `plan.md`, T29/04)

Mismo combo + alta inline que la Tarea 3, pero en el flujo de escaneo de la
PWA — el vendedor no debe poder tipear una marca nueva "suelta" sin que quede
guardada en el catálogo.

## Pasos

- [x] `AltaScreen.tsx` — mismo cambio de fondo que la Tarea 3: `<input placeholder="Marca">` gana `list="alta-marcas"` + `<datalist>` poblado con `GET /admin/brands` (fetch nuevo, en paralelo al de categorías, sin bloquear el formulario si falla).
- [x] El estado `marca` sigue siendo un string libre (igual que antes) — el cambio real es qué se manda al guardar.
- [x] `handleSubmit` — `brand: marca.trim()` → `newBrandName: marca.trim()`, mismo contrato que `alta-rapida` actualizado en la Tarea 2. Igual que en el admin (Tarea 3), **siempre** viaja como `newBrandName` — la resolución (reusar por slug vs. crear) la hace `resolveBrandId` en el backend, no el cliente.
- [x] No hizo falta refrescar la lista de marcas a media sesión: cada escaneo nuevo desmonta/remonta `AltaScreen` (vía el cambio de pantalla en `App.tsx`), así que el `useEffect` de carga vuelve a pedir `/admin/brands` solo, y la marca creada en el escaneo anterior ya aparece.

## Cómo se verificó

**Playwright real** (`pwa/t29-04-pwa-marca.mjs`, viewport 390×844 — celular real, mismo patrón de org/usuario descartables que `t27-01-confirmaciones.mjs`, no toca datos de Eliathi, limpia todo al final):

1. Login → modo "Recibir mercadería" → escanear (manual) un código nuevo → llega a "Producto nuevo".
2. Elegir en el combo una marca YA existente (sembrada por SQL en el setup) → completar el resto → guardar → `POST /admin/products/alta-rapida` 201 → el producto quedó con el `brandId` correcto → **no se duplicó** la marca.
3. Escanear un segundo código nuevo → escribir una marca que NO existe (alta inline) → guardar → 201 → se creó la marca nueva en la DB → el producto quedó enlazado a ella.
4. Cleanup: 0 filas huérfanas al terminar.

**7/7 PASS en la primera corrida**, sin ajustes. `npx tsc --noEmit` limpio en `backend/`, `frontend/` y `pwa/` (0 errores en los tres).

## Definition of Done

- [x] El campo Marca de `AltaScreen.tsx` es un combo (input + datalist real, no más solo texto libre sin sugerencias).
- [x] Alta inline de una marca nueva funciona sin salir de la pantalla de alta, y la marca queda disponible para cargas siguientes (confirmado al re-loguear el flujo en el segundo escaneo del mismo test).

## Dependencias

- **La bloquean:** Tarea 2.
- **Bloquea:** nada de T29.
