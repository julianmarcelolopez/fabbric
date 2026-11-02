# Tarea 2 — Frontend: buscador + columnas + paginación en `StockPage.tsx`

**Estado:** ✅ Hecha. `tsc --noEmit` y `vite build` limpios en `frontend/`.
Falta la verificación visual en navegador (criterio constante del
proyecto) — `backend`/`frontend` quedaron corriendo en Docker para
probarlo.

**Depende de:** Tarea 1.

## Objetivo (según `plan.md`, T39/Fase 2)

Que encontrar una variante específica entre las 763 (hoy todas
renderizadas sin filtro de texto ni paginación) sea tan rápido como en la
tab "Todos los productos" — buscar por nombre, marca o código de barras,
ver la foto, y paginar en vez de scrollear una tabla gigante.

## Alcance

- `frontend/src/features/admin/pages/StockPage.tsx`:
  - Nuevo estado `search` (string) + `useMemo` que filtra `data.items` por
    `productName`/`brandName`/`barcode` (case-insensitive, `includes`) —
    mismo patrón que `search` en `ProductsPage.tsx`.
  - Combinar con el filtro `onlyCritical` ya existente (línea 165): primero
    texto, después crítico, después paginar.
  - Tabla (desde la línea 198): nueva columna de foto (`<img
    className="thumb">` o placeholder, antes de "Producto") y columna
    "Marca" (entre "Producto" y "Variante"). La columna "Variante" (línea
    215) suma el `barcode` al lado del `sku` que ya muestra.
  - Paginación: mismo patrón `page`/`pageSize` (opciones 10/20/30/50) que
    `ProductsPage.tsx`, aplicada sobre el resultado ya filtrado. Reset de
    `page` a 1 cuando cambian `search`/`onlyCritical`/`pageSize`.
  - El `expanded` (fila de "Mover"/"Historial" abierta) debe seguir
    funcionando igual con la tabla paginada — si la página cambia con una
    fila expandida, cerrarla (mismo criterio que evita quedar en un estado
    inconsistente).

## Criterio de aceptación

- `tsc --noEmit` limpio en `frontend/`.
- En Docker local, con las 763 variantes reales: buscar un código de
  barras conocido devuelve esa fila exacta; buscar una marca filtra
  correctamente; "Solo críticos" sigue funcionando combinado con la
  búsqueda; la paginación no rompe "Mover" ni "Historial".
- Verificado en el navegador, no solo por tipos (criterio constante del
  proyecto).

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** ninguna.
