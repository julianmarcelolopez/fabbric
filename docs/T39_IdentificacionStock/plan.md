# Plan — Identificar y cambiar stock más fácil (T39)

Basado en `analisis.md` (estado real de `StockPage.tsx`/`stockOverview()`
verificado contra el código, decisiones de diseño ya resueltas ahí). Dos
fases por dependencia; no repite el análisis.

| # | Fase | Depende de |
|---|---|---|
| 1 | Backend: `stockOverview()` suma marca/barcode/foto | nada |
| 2 | Frontend: buscador + columnas + paginación en `StockPage.tsx` | 1 |

## Desglose en tareas

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| 1 | [01-backend-datos-identificacion](tareas/01-backend-datos-identificacion/01-backend-datos-identificacion.md) | nada | ✅ |
| 2 | [02-frontend-buscador-y-columnas](tareas/02-frontend-buscador-y-columnas/02-frontend-buscador-y-columnas.md) | 1 | ✅ |

## Fase 1 — Backend

- `backend/src/modules/stock/routes.ts`, `stockOverview()`: sumar al
  select `brandName` (left join `brands` sobre `products.brandId`, igual
  que `GET /admin/products`), `barcode` (`productVariants.barcode`, ya
  está en la tabla) y `firstImageUrl` (join a `productImages` por
  `productId`, ordenado por `sortOrder`, tomar la primera — mismo patrón
  ya usado en `productsRoutes`).
- `packages/shared`: sumar los 3 campos al tipo que describe cada item de
  `/admin/stock` si está tipado ahí (revisar `StockItem` en
  `frontend/src/features/admin/types.ts` — hoy es un tipo del frontend,
  confirmar si corresponde moverlo a shared o solo extenderlo ahí).

**Verificación**: `tsc --noEmit` limpio en `backend/`; `curl` contra
`/admin/stock` en Docker y confirmar que cada item trae `brandName`,
`barcode` y `firstImageUrl` (`null` donde no haya).

## Fase 2 — Frontend (`StockPage.tsx`)

- Nuevo estado `search` + filtro client-side (mismo patrón que
  `ProductsPage.tsx`: `useMemo` sobre `data.items`, matchea
  `productName`/`brandName`/`barcode`), combinado con el filtro
  `onlyCritical` ya existente.
- Nuevas columnas en la tabla: foto (thumbnail antes de "Producto"),
  marca (entre "Producto" y "Variante"), y el `barcode` al lado del `sku`
  ya mostrado en "Variante".
- Paginación: mismo patrón `page`/`pageSize` (10/20/30/50) que
  `ProductsPage.tsx`, aplicada después de buscar/filtrar.
- Reset de `page` a 1 cuando cambian `search`/`onlyCritical`/`pageSize`
  (mismo criterio que `ProductsPage.tsx`).

**Verificación**: en Docker local, con las 763 variantes reales — buscar
por un código de barras conocido y confirmar que aparece esa fila exacta;
buscar por marca; confirmar que la paginación no rompe "Mover"/"Historial"
expandido; `tsc --noEmit` limpio en `frontend/`.

## Criterios de aceptación y fuera de alcance

Ver `analisis.md` — no se repiten acá.
