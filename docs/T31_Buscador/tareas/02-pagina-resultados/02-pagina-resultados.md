# Tarea 2 — Frontend: página de resultados completos

**Estado:** ✅ Hecha — verificada con Playwright real (9/9 PASS).

**Depende de:** Tarea 1 (necesita el endpoint).

## Objetivo (según `plan.md`, T31/02)

`/store/:slug/buscar?q=texto` funciona igual que categoría/colección/marca/
novedades/ofertas — reusando `CategoryPage.tsx` como sexto modo, no un
componente nuevo (decisión de `analisis.md` sección 3).

## Pasos

### 1. Tipos

- [x] `store/types.ts` — `PublicSearchResults` (= `PublicProductListing` + `query: string`).

### 2. `CategoryPage.tsx`

- [x] `Mode` suma `"search"`.
- [x] `q` se lee de `searchParams.get("q") ?? ""` (no de `useParams()`).
- [x] `q` sumado a las dependencias del efecto de reset de filtros y del efecto de fetch.
- [x] Fetch: nuevo branch `` `/public/${slug}/search?${params}` `` (con `q` seteado en `params`); si `q` está vacío, no pega al backend (evita el 400 esperado al entrar directo a `/buscar` sin término) y muestra un mensaje propio.
- [x] `data`/`publicJson` sumaron `PublicSearchResults` a la unión.
- [x] `item` — caso especial `mode === "search" ? { name: \`Resultados para "${q}"\` } : ...` (no entra en `MODE_TEXT`, es dinámico).
- [x] Mensaje de "sin resultados" — caso especial con el término incluido, distinto según si `q` está vacío ("Escribí algo para buscar.") o no matcheó nada (`No encontramos productos que coincidan con "${q}".`).
- [x] `MODE_TEXT["search"]` completa las partes estáticas (`indexLabel: null`, `notFound: "resultados para tu búsqueda"`).

### 3. Rutas

- [x] `router.tsx` — `{ path: "buscar", element: <CategoryPage mode="search" /> }`.

## Bug real encontrado y corregido (no era un problema del test)

El efecto de debounce de filtros (300ms) **reconstruye la URL desde cero**
(`page` + `talle`/`color`/`marca`/precio/`sort`), sin preservar `q`. En
desarrollo, React 18 StrictMode invoca los efectos dos veces al montar — el
`useRef` que hace de guard (`didMountFilters`) es el **mismo ref** en las
dos invocaciones, así que la primera lo marca `true` y la segunda invocación
del *mismo* efecto ya no entra en el guard temprano: programa el
`setTimeout` de 300ms igual, y a los 300ms reemplaza la URL entera —
**borrando `?q=` sin que el usuario tocara nada**. El síntoma: entrar a
`/buscar?q=remera` mostraba productos de "remera" correctamente por un
instante, pero el título quedaba en `Resultados para ""` porque la URL real
ya no tenía `q`. Corregido agregando `if (mode === "search" && q)
next.set("q", q);` a ese bloque — la URL reconstruida ahora preserva el
término de búsqueda.

## Cómo se verificó

**Playwright real** (`frontend/t31-02-pagina-resultados.mjs`, org
descartable con 26 productos que matchean un término + 1 que no + variantes
con stock — no toca datos de Eliathi, limpia todo al final):

1. `/buscar?q=término` → título y breadcrumb (2 niveles) incluyen el término real; 26 resultados (no 27 — el que no matchea queda afuera); página 1 con 24, página 2 con los 2 restantes (paginación real, esperando la respuesta HTTP de la página 2 antes de leer el DOM — mismo patrón de espera que T29/T30).
2. Término sin coincidencias → mensaje con el término exacto.
3. `/buscar` sin `q` → mensaje propio ("Escribí algo para buscar."), sin pegarle al backend (que devolvería 400).
4. Cleanup: 0 filas huérfanas.

**9/9 PASS.** `npx tsc --noEmit` limpio en `backend/` y `frontend/`.

## Definition of Done

- [x] `/store/:slug/buscar?q=texto` funciona con banner, toolbar, grilla y paginación reales.
- [x] El mensaje de "sin resultados" incluye el término buscado.
- [x] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** nada directamente — pero conviene tenerla lista antes de la verificación final, porque el link "Ver todos los resultados" del dropdown (Tarea 3) apunta acá.
