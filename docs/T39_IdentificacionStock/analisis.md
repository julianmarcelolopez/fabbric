# T39 — Identificar y cambiar stock más fácil

## Contexto

Pedido del usuario mirando `/admin/products?tab=stock` con 763 variantes
críticas: "quiero que sea más fácil cambiar el stock de un producto...
identificarlo y cambiarlo". El disparador fue literal: en la columna
"Producto" de esa tabla se ven filas como "121", "1428", "1428" — porque
esa columna muestra `item.productName` tal cual
(`frontend/src/features/admin/pages/StockPage.tsx:214`), y bastantes
productos quedaron nombrados solo con el número de modelo (lo que trae la
etiqueta física), sin nada descriptivo — mismo origen de datos que
`docs/bugs/B001_ProductosDuplicadosPorModelo/` (altas rápidas por
escaneo, "Modelo" tipeado o pre-cargado tal cual venía del código).

## Estado real de `/admin/products?tab=stock` (verificado contra el código)

Backend — `stockOverview()` en `backend/src/modules/stock/routes.ts:18-44`:
trae `variantId, productId, productName, talle, color, sku, stockOnline,
stockLocal` con un join a `products` nada más — **sin marca, sin
imagen, sin barcode**. Ordena por `products.name` (línea 34), así que con
nombres tipo "1428" el orden tampoco ayuda a agrupar nada reconocible.

Frontend — `StockPage.tsx`: la tabla (línea 198 en adelante) muestra
exactamente esos campos — Producto/Variante/Online/Local/Total — sin
ningún input de búsqueda, sin paginación (las 763 filas se renderizan
todas de una, el único filtro es el checkbox "Solo críticos" línea
184-187, client-side). Identificar una fila específica entre cientos, sin
foto ni marca ni código de barras, obliga a abrir cada producto en otra
pestaña para confirmar qué es.

`ProductsPage.tsx` (la tab "Todos los productos", hermana de esta) sí
tiene foto (`p.firstImageUrl`, línea ~281), marca (`p.brandName`),
buscador con debounce-free client-side filter (`search`, línea ~220) y
paginación (`pageSize`/`page`, agregado en T32) — Stock es la única tab de
Productos que se quedó sin ninguna de esas tres cosas.

## Decisiones de diseño

1. **No se toca el mecanismo de "Mover" stock** (el formulario con
   tipo/canal/cantidad/nota) — ese ya fuerza un movimiento auditable por
   diseño (`POST /admin/variants/:id/stock-movements`, "única vía de
   cambio" según su propio summary) y no fue parte del pedido. El pedido es
   sobre *encontrar* la fila correcta más rápido, no sobre cómo se edita
   una vez encontrada.
2. **Mismo patrón que `ProductsPage.tsx`**, no uno nuevo: foto + marca +
   buscador + paginación — Stock pasa a tener la misma barra de
   herramientas que ya existe y funciona en la tab de al lado, por
   consistencia.
3. **Buscador incluye código de barras**, no solo nombre — es el caso de
   uso real: alguien tiene la prenda en la mano, escanea o lee el código, y
   busca esa fila exacta. El código de barras no se mostraba en ningún
   lado de Stock hasta ahora.

## Backend

`stockOverview()` suma al select: `brandName` (left join `brands`,
mismo patrón que `GET /admin/products`), `barcode`
(`productVariants.barcode`, ya existe en la tabla, solo falta
seleccionarlo) y `firstImageUrl` (join a `productImages` ordenado por
`sortOrder`, mismo patrón ya usado en `GET /admin/products`).

## Frontend (`StockPage.tsx`)

- Columna de foto (thumbnail, mismo `className="thumb"` que ya usa
  `ProductsPage.tsx`) antes de "Producto".
- Columna "Marca" entre "Producto" y "Variante".
- La columna "Variante" ya muestra `sku` si existe (línea 215) — se agrega
  el `barcode` al lado, mismo criterio.
- Input de búsqueda arriba de la tabla (texto libre, client-side, mismo
  patrón `search`/`useMemo` que `ProductsPage.tsx`) que matchea contra
  `productName`, `brandName` **y** `barcode`.
- Paginación (reusa el mismo patrón `page`/`pageSize` de
  `ProductsPage.tsx`, con el mismo selector 10/20/30/50 por página) — hoy
  las 763 filas se renderizan todas juntas.
- El checkbox "Solo críticos" sigue funcionando igual, combinado con el
  buscador y la paginación (mismo orden de filtros que `ProductsPage.tsx`:
  filtrar → paginar).

## Qué NO cambia

- El formulario "Mover" y el historial de movimientos — intactos.
- El cálculo de `critical`/`lowStockThreshold` — intacto.
- `ProductsPage.tsx` (la tab de productos) — no se toca, ya tiene todo
  esto.

## Fuera de alcance de T39

- Edición inline del número de stock sin pasar por un movimiento
  auditable — rompería el principio de "el stock nunca se setea, se
  mueve" (ver T4), no se propone acá.
- Ordenar por "menor stock primero" u otros criterios de orden nuevos —
  no pedido, se puede agregar después si hace falta.
- Arreglar los nombres de producto genéricos/numéricos en sí (ej. "1428")
  — eso es un problema de datos, no de esta pantalla; el buscador por
  código de barras es justamente lo que compensa que el nombre no
  alcance para identificar un producto.

## Criterios de aceptación

- La tabla de Stock muestra foto, marca y código de barras de cada
  variante, igual que la tabla de Productos.
- Buscar por nombre, marca o código de barras filtra la tabla
  correctamente, combinado con "Solo críticos".
- Con 763 variantes, la tabla pagina en vez de renderizar todo de una.
- `tsc --noEmit` limpio en `backend/` y `frontend/`.
- Verificado en el navegador (Docker), no solo por tipos.
