# T11 — Precio con descuento (`docs/plan_2.md`, demo Eliathi Modas)

## Objetivo de la fase

Que un producto pueda tener un precio original + un precio con descuento (tachado), replicando el patrón que Edgar ya usa hoy en su catálogo de WhatsApp Business ("Ahorrás $X"). Es la feature de mayor impacto visual del plan de demo y la más barata de construir.

Criterio de verificación (de `docs/plan_2.md`): *producto con `compareAtPrice` cargado se ve con precio tachado + precio final en el card y en el detalle, en la tienda pública*.

## Decisiones que marcan esta fase

- **`compareAtPrice` a nivel producto**, no a nivel variante — no interactúa con `priceOverride` de `product_variants` (que pisa el precio, no representa un descuento). Si una variante tiene `priceOverride`, el tachado no aplica sobre ese precio: se prioriza mantener esto simple para v1, no combinar ambos mecanismos.
- Campo **nullable**: la mayoría de los productos no van a tener descuento. Sin valor → comportamiento idéntico a hoy.
- El tachado se muestra solo si `compareAtPrice > price` — un `compareAtPrice` menor o igual al precio actual no se interpreta como descuento (no se muestra nada raro, se ignora).
- Centavos (int), mismo criterio que `price`/`costPrice` — sin flotantes.

## Lista de tareas

| # | Tarea | Depende de | Estado |
|---|-------|-----------|--------|
| 1 | [01-schema-y-endpoints.md](01-schema-y-endpoints.md) — columna `compareAtPrice`, migración, schema compartido, rutas admin + públicas | — | ✅ Completada |
| 2 | [02-precio-tachado-ui.md](02-precio-tachado-ui.md) — campo en `ProductEditPage`, tachado en `ProductCard`/`ProductDetailView` | 1 | ✅ Completada |
| 3 | [03-verificacion-final.md](03-verificacion-final.md) — Definition of Done de T11 | 1-2 | ✅ Completada |

## Recordatorios operativos (gotchas acumulados del proyecto)

- Migración: `db:generate -- --name product_compare_at_price` + `db:migrate` — desde el contenedor usar el session pooler (`sed s/:6543/:5432/` sobre `DATABASE_URL`; `DIRECT_URL` es IPv6-only). **Nunca** `db:push`.
- Rutas nuevas o campos nuevos en rutas existentes → actualizar `schema` Swagger con Zod de shared.
- Si T12 (Marca) se hace en la misma sesión, evaluar si conviene una sola migración con las dos columnas (`compareAtPrice` + `brand`) en vez de dos migraciones separadas — no es obligatorio, cada fase puede generar la suya.
- Typecheck y verificación en navegador antes de dar la tarea por cerrada.
- **Backend local para pruebas manuales**: se puede levantar con `npx tsx src/index.ts` desde `backend/` contra la DB real (session pooler, sin Docker) para probar endpoints con `curl` sin depender de la UI. Gotcha real: `pkill -f "tsx src/index.ts"` **no mata el proceso de forma confiable en Git Bash/Windows** — dejó un proceso viejo sirviendo código desactualizado en el puerto 4000 sin avisar (curl seguía respondiendo 200, con datos stale). Verificar con `Get-NetTCPConnection -LocalPort 4000` (PowerShell) + `Stop-Process -Id <pid> -Force` para matarlo de verdad.

## Próximo paso al cerrar T11

T11, T12, T13, T14 y T15 son independientes entre sí (no hay orden obligatorio) — seguir con la que sea más cómoda. T16 depende de que T15 exista. T17 cierra la demo completa y depende de todas las anteriores.
