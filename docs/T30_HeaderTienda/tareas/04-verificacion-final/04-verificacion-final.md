# Tarea 4 — Verificación final

**Estado:** ✅ Hecha — circuito completo verificado con Playwright real (11/11 PASS).

**Depende de:** Tareas 1-3 completas.

## Objetivo (según `plan.md`, T30/04)

Circuito completo probado en el navegador real antes de dar T30 por
cerrado — mismo criterio que se usó en `T29_Marcas` (Playwright real contra
la app levantada con `docker compose`, no solo tipos/build).

## Checklist

- [x] Header muestra Inicio/Explorar/Novedades/Ofertas en las 4 páginas principales, con el activo resaltado en cada una (y "Inicio" sin quedar marcado activo en las otras tres).
- [x] "Novedades" muestra los productos más recientes primero, paginado, con los filtros (talle/color/marca/precio) funcionando.
- [x] "Ofertas" muestra solo productos con precio tachado (`compareAtPrice` no nulo).
- [x] Footer sigue mostrando la lista real de categorías, sin cambios.
- [x] Un tenant/escenario con 0 productos en oferta ve la página de Ofertas con el estado vacío correcto (no un error ni pantalla en blanco).
- [x] El filtro de marca (por slug) funciona igual dentro de Novedades/Ofertas que dentro de una categoría.

## Hallazgo real durante la verificación (falso positivo, no un bug de la app)

Al navegar por **click real** en el header (Inicio → Explorar), la primera
corrida del script mostraba `CategoriesIndexPage` trabado en "Cargando…"
incluso después de esperar varios segundos, mientras que llegando a la misma
URL por `page.goto` directo cargaba perfecto. Investigado a fondo
(instrumentando la página con logs y capturando screenshots): **no es un bug
de la aplicación** — es una carrera de red propia del entorno de desarrollo:
el Home dispara sus propios fetches (`config`, `shipping-zones`, `home`) al
montar, y si se navega a Explorar antes de que esos terminen, el fetch de
`/home` que dispara `CategoriesIndexPage` queda compitiendo por conexión con
los anteriores en el servidor de Vite (dev, no producción) y tarda varios
segundos de más en resolver — no nunca. Con más tiempo de espera (10s en vez
de 3s) se confirmó que sí resuelve. El script se corrigió esperando
`networkidle` después de cada `goto`/navegación en vez de una espera fija
corta, y no se tocó ningún código de la app (`CategoriesIndexPage.tsx` quedó
exactamente como en T29/06).

## Cómo se verificó

**Playwright real** (`frontend/t30-04-verificacion-final.mjs`, dos orgs
descartables — una con 2 marcas y 4 productos con fechas/precios/marcas
controlados, otra vacía para el estado sin ofertas — no tocan datos de
Eliathi, limpian todo al final). A diferencia de las Tareas 1-3 (que
verificaron cada pieza por separado, mayormente con `goto` directo), esta
navega por **click real en los links del header**, de punta a punta:

1. Inicio → click "Explorar" → click "Novedades": en cada paso, el link correspondiente queda resaltado activo.
2. En Novedades: orden por más nuevo primero confirmado con productos de `created_at` controlados.
3. **Filtro de marca por click real** (no por URL) dentro de Novedades: el chip de marca dispara el fetch con el slug correcto (`?marca=e2e-brand-x-...`) y la grilla queda con solo los productos de esa marca.
4. click "Ofertas": solo el producto con precio tachado.
5. Footer: sigue mostrando la categoría real del tenant, sin cambios.
6. Tenant sin ninguna oferta, llegando por click desde Inicio: estado vacío específico, sin error.
7. Cleanup: 0 filas huérfanas.

**11/11 PASS.** `npx tsc --noEmit` limpio en `backend/` y `frontend/`.

## Definition of Done

- [x] Todos los ítems del checklist verificados en el navegador real.
- [x] Backend y frontend compilan limpio.

## Dependencias

- **La bloquean:** Tareas 1-3.
- **Bloquea:** nada — es la última tarea de T30.

## Cierre de T30_HeaderTienda

Con esta tarea se completan las 4 tareas del plan:

- **Backend**: dos endpoints públicos nuevos (`/novedades/products`, `/ofertas/products`), mismo patrón que categoría/colección/marca, sin entidad propia en la DB.
- **Frontend**: `CategoryPage.tsx` extendido a 5 modos, con un refactor real (`MODE_TEXT`) que además corrigió un bug heredado de T29/06 (mensaje de "sin productos" nunca actualizado para el modo `"brand"`).
- **Header**: nav dinámica (categorías del tenant) reemplazada por 4 links fijos; footer sin cambios, a propósito.
