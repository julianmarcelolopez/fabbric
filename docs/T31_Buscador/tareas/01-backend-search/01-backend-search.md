# Tarea 1 — Backend: endpoint de búsqueda

**Estado:** ✅ Hecha — verificada en vivo contra `docker compose up -d backend`.

**Depende de:** nada.

## Objetivo (según `plan.md`, T31/01)

Endpoint público nuevo, mismo contrato de seguridad y paginado que el resto
de `public/routes.ts`, sin filtros combinados (fuera de alcance de esta v1,
ver `analisis.md` sección 6).

## Pasos

Todo en [backend/src/modules/public/routes.ts](../../../../backend/src/modules/public/routes.ts):

- [x] `searchQuery` — querystring propio (`q`, `page`, `sort?`), sin `talle`/`color`/`marca`/precio — no reusa `productListQuery` para no prometer filtros que este endpoint no acepta.
- [x] `q` obligatorio (`z.string().min(1)`) — Fastify/Zod devuelve 400 solo, sin chequeo manual.
- [x] Búsqueda case-insensitive: `ilike(products.name, \`%${q}%\`)`.
- [x] `scopeFilter`: `orgId`, `visibleInCatalog`, `status !== paused`, `ilike(name)`.
- [x] `resolveSort()` reusado tal cual para `?sort=`.
- [x] Devuelve `{ query, products, page, pageSize, totalCount, totalPages, availableFilters: { talles: [], colores: [] } }` — sin `marcas` (mismo criterio que la página de una marca puntual).
- [x] Mismo patrón `firstImages`/`imageOf` para las imágenes.
- [x] Insertado al final del archivo, después del endpoint de listado de marcas.

## Cómo se verificó

`docker compose up -d --build backend` (real) + `curl`:

- `GET /public/eliathi-modas/search?q=REMERA` → 3 resultados, case-insensitive confirmado (query en mayúsculas, nombres reales en mixed-case).
- `GET /public/eliathi-modas/search` (sin `q`) → **400**.
- `GET /public/eliathi-modas/search?q=` (vacío) → **400**.
- `GET /public/eliathi-modas/search?q=zzzznoexiste` → `totalCount: 0`, `products: []`, sin error.
- `GET /public/eliathi-modas/search?q=a&sort=precio_asc` → precios en orden ascendente, confirmando que `resolveSort` funciona igual que en el resto de los endpoints.
- `npx tsc --noEmit` limpio en `backend/`.

## Definition of Done

- [x] `GET /public/:slug/search?q=texto` devuelve productos cuyo nombre coincide parcialmente, case-insensitive, paginados.
- [x] Sin `q` o `q` vacío → 400.
- [x] Backend compila limpio.

## Dependencias

- **La bloquean:** nada.
- **Bloquea:** Tareas 2 y 3 (ambas necesitan este endpoint).
