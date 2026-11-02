# T41 — Clic en la foto vacía de Productos → directo a "Fotos"

## Pedido original

Mirando `/admin/products` (screenshot de la fila "Costura al lado"): "quiero
pinchar el recuadro blanco y que vaya a la sección del producto de agregar
imagen."

## Estado actual (verificado contra el código)

- `frontend/src/features/admin/pages/ProductsPage.tsx:~279-284`: la celda de
  foto renderiza `<img className="thumb">` si hay `firstImageUrl`, o un
  `<span className="thumb" />` vacío (el recuadro blanco/gris de 48×48,
  `admin.css:141`) si no hay. **Ninguno de los dos es clicable** — el único
  link a la ficha es el nombre (`<Link to={/admin/products/${p.id}}>`).
- `frontend/src/features/admin/pages/ProductEditPage.tsx`: la ficha es un
  wizard de 3 pasos (`step` en `useState<Step>(1)`, línea 97): 1 Datos,
  2 Variantes, 3 **Fotos** (`<ImageDropzone>`, línea ~443). Siempre arranca
  en el paso 1; no lee nada de la URL. Hoy, para subir una foto desde la
  lista hay que: abrir el producto → "Siguiente" → "Siguiente" (o clic en el
  círculo del paso 3 — solo habilitado si el paso ya fue "visitado/completo").

## Comportamiento esperado

1. En la lista de productos, la miniatura (con o sin foto) es un link a
   `/admin/products/:id?step=3`.
2. Al llegar con `?step=3`, `ProductEditPage` abre directo en el paso
   "Fotos" (el `ImageDropzone`), sin pasar por los pasos 1 y 2.
3. Sin `step` en la URL (clic en el nombre, ruta de siempre) → sin cambios,
   arranca en el paso 1.

## Diseño

**`ProductsPage.tsx`** — envolver la miniatura en
`<Link to={\`/admin/products/${p.id}?step=3\`}>`. El recuadro vacío suma
`title="Agregar foto"` y cursor pointer; la miniatura con foto también
lleva al paso Fotos (agregar más / reordenar / borrar), mismo destino, sin
distinguir casos. El link del nombre queda como está.

**`ProductEditPage.tsx`** — leer `step` con `useSearchParams` y usarlo como
valor inicial de `useState<Step>` (solo `1|2|3` válidos; cualquier otra
cosa → 1). Es solo estado inicial: no se sincroniza la URL al navegar el
wizard (YAGNI, el wizard hoy no usa la URL).

**Alcance de la regla "al menos una variante"**: `goToStep3()` (línea 208)
bloquea pasar a Fotos sin variantes, pero eso es una regla del *flujo
guiado* hacia publicar, no una restricción de datos —
`ImageDropzone` solo necesita `productId`. Con `?step=3` se entra directo
sin esa validación, porque el pedido es justamente poder cargar la foto sin
recorrer el wizard. **Decidido con el usuario**: en teoría todo producto
debería tener variantes, así que la carga de foto no se restringe.

## Fuera de alcance

- Subir la foto directo desde la lista (modal/drag & drop en la fila).
- Sincronizar el paso del wizard con la URL al navegar entre pasos.
- Tocar la tab de Stock (`StockPage.tsx`, T39) que también muestra miniatura.

## Decisiones (2026-11-02)

1. Producto sin variantes + `?step=3`: **entra igual a Fotos** (decidido por
   el usuario; no se restringe la carga de foto).
2. Miniatura con foto: **también lleva a Fotos** (mismo destino, un solo
   comportamiento; sirve para agregar/reordenar/borrar).

## Criterios de aceptación

- Clic en el recuadro vacío de un producto sin foto → abre su ficha en el
  paso Fotos.
- Clic en el nombre → abre en el paso 1 como siempre.
- `?step=7` / `?step=abc` → paso 1, sin error.
- `tsc --noEmit` limpio en `frontend/`; verificación visual en navegador
  (Docker compose), según preferencia del proyecto.
