# Tarea 2 — Admin: color opcional en `VariantEditor.tsx`

**Estado:** ✅ Hecha. `tsc --noEmit` y `vite build` limpios en
`frontend/`. Falta la verificación visual en navegador (criterio
constante del proyecto) — `frontend` quedó corriendo en Docker para
probarlo.

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T43 punto 4)

Que cargar/editar una variante sin color desde el admin de escritorio
no quede bloqueado por el navegador — hoy el input tiene `required`.

## Alcance real (se amplió al tocar los tipos)

- `frontend/src/features/admin/types.ts`: `Variant.color` y
  `StockItem.color` pasan de `string` a `string | null` — reflejan lo
  que realmente puede devolver el backend desde la Tarea 1.
- `frontend/.../components/VariantEditor.tsx`:
  - Sacado el atributo `required` del `<input>` de color del
    formulario de alta; label ahora dice "Color (opcional)".
  - `useState(variant.color ?? "")` en la fila de edición (un input
    controlado no puede recibir `value={null}`).
  - Al guardar (alta y edición), el color se manda `color.trim() ===
    "" ? null : color.trim()` — mismo patrón ya usado para `sku` y
    `barcode` en este archivo.
  - Confirmación de borrado (`¿Borrar la variante…?`) y placeholder
    del input de color en la fila de edición ajustados para no armar
    el texto con un color vacío.
- **Hallazgo, al cambiar el tipo `Variant.color`/`StockItem.color` a
  nullable** — 2 pantallas más armaban texto tipo `"{talle}/{color}"`
  a mano y hubieran mostrado literalmente `/null` para una variante
  sin color; corregidas para mostrar solo el talle cuando no hay
  color:
  - `frontend/src/features/admin/pages/OrderNewPage.tsx` (líneas 96 y
    228 — venta manual, selector y label de variante).
  - `frontend/src/features/admin/pages/StockPage.tsx` (línea 270 —
    columna "Variante").
- Sin cambios en "Talle" — sigue obligatorio, sigue tal cual (el
  cliente lo usa tipeando "120ML" directo, sin que el código lo
  distinga de un talle de ropa).

## Criterio de aceptación

- `tsc --noEmit` y `vite build` limpios en `frontend/`. ✅
- En Docker local: crear una variante nueva sin tocar el campo color
  → se guarda sin error. Editar una variante existente y vaciar su
  color → se guarda como `null` (confirmar recargando la página).
  ⬜ Pendiente de probar en el navegador.
- Verificado en el navegador, no solo por tipos. ⬜ Pendiente.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** ninguna.
