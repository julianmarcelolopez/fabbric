# Tarea 3 — Storefront: ocultar selector de color si no hay

**Estado:** ✅ Hecha y verificada. `tsc --noEmit` y `vite build`
limpios en `frontend/`. Verificación visual automatizada con
Playwright: **10/10 checks OK** — ver `frontend/t43-storefront-color-opcional.mjs`
y las capturas en [`test/`](test/).

**Hallazgo real encontrado por el test** (no estaba previsto en
`plan.md`): el botón de compra decía **"Elegí talle y color"** incluso
para un producto sin color — quedaba un texto incorrecto/confuso para
un perfume antes de elegir el talle. Corregido en
`ProductDetailView.tsx` para que diga solo "Elegí talle" cuando el
producto no tiene eje de color (`colores.length === 0`).

**Segundo hallazgo** (backend, `public/routes.ts`): las 5 queries
públicas que arman el filtro "Color" de categoría/colección/marca/
novedades/ofertas no excluían `color: null` — un perfume con stock
online hubiera aparecido como un filtro de color "null" en esas
páginas (y roto el tipo `colores: string[]` del lado del frontend).
Corregido sumando `isNotNull(productVariants.color)` a esas 5 queries.

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T43 punto 5)

Que la ficha de producto en la tienda online no muestre un selector
de "Color" vacío o sin sentido para un perfume — solo "Talle"
(volumen).

## Alcance real

- `frontend/src/features/catalog/ProductDetailView.tsx`:
  - `PdvVariant.color` pasa de `string` a `string | null`.
  - `colores` filtra los valores null antes de calcular
    `colores.length` — con `.filter((c): c is string => !!c)` en vez
    de `Boolean` a secas (necesario para que TS angoste el tipo del
    array resultante a `string[]`, no `(string | null)[]`).
  - El texto "Quedan solo N unidades en talle T · color" ahora omite
    el `· color` cuando no hay color seleccionado (perfumes).
- **Hallazgo, al propagar el tipo nullable** — 4 archivos más tenían
  el mismo patrón de armar `"{talle}/{color}"` a mano y hubieran
  mostrado `/null`, corregidos:
  - `frontend/src/features/store/pages/StoreProductPage.tsx` (tipo
    local del parámetro de `addToCart`).
  - `frontend/src/features/cart/CartContext.tsx` (`CartItem.color` a
    `string | null`) y `CartDrawer.tsx` (texto del ítem en el drawer).
  - `frontend/src/features/store/pages/CheckoutPage.tsx` (resumen del
    pedido).
  - `frontend/src/features/store/pages/OrderDetailPage.tsx` (detalle
    de un pedido ya hecho, portal de clientes).
- Confirmado que el selector de "Talle" sigue apareciendo solo (sin
  depender de que haya color).

## Criterio de aceptación

- `tsc --noEmit` y `vite build` limpios en `frontend/`. ✅
- Ficha de un producto cuyas variantes tienen `color: null` → no
  aparece el selector de "Color", solo el de "Talle". ✅ Verificado
  por Playwright (org/producto descartables, no el producto real del
  cliente — ver `test/01-perfume-sin-selector-color.png`).
- Ficha de un producto de ropa existente (con color) → sin cambios,
  selector de color sigue apareciendo igual que siempre. ✅ Verificado
  (`test/03-remera-con-selector-color.png`).
- El filtro de "Color" de la página de categoría no incluye `null`
  como si fuera un color real. ✅ Verificado contra la respuesta real
  del endpoint (`test/04-categoria-filtros.png`).

## Verificación automatizada (Playwright)

`frontend/t43-storefront-color-opcional.mjs` — crea una org/categoría/
2 productos descartables (un perfume sin color, una remera con
color), corre contra `http://localhost:5173` (Docker), repite los
checks de arriba programáticamente, guarda 4 capturas en
[`test/`](test/), y borra todos los datos de prueba al final
(confirmado por el propio script). Correr con:
```
cd frontend && node t43-storefront-color-opcional.mjs
```
Resultado de la última corrida: **10 PASS, 0 FAIL**.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** ninguna.
