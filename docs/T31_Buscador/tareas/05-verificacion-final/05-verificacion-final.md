# Tarea 5 — Verificación final

**Estado:** ✅ Hecha — circuito completo verificado con Playwright real (11/11 PASS).

**Depende de:** Tareas 1-4 completas.

## Objetivo (según `plan.md`, T31/05)

Circuito completo probado en el navegador real — mismo criterio que
`T29_Marcas` y `T30_HeaderTienda` (Playwright real contra la app levantada
con `docker compose`, no solo tipos/build).

## Checklist

- [x] Escribir un nombre de producto real en el buscador muestra resultados coincidentes en menos de un segundo, con debounce (confirmado contando requests de red: uno solo al tipear letra por letra, no uno por tecla).
- [x] Un término sin coincidencias muestra el estado vacío con sugerencias (categoría real), nunca un panel en blanco ni un error.
- [x] "Ver todos los resultados" lleva a `/store/:slug/buscar?q=...` con el total real de coincidencias (26), paginado.
- [x] Cada resultado del dropdown navega directo a la ficha de producto correcta.
- [x] En mobile (≤768px), la lupa abre el overlay de pantalla completa, sin romper el layout del header.
- [x] Verificado con un término que devuelve 1 y más de 24 resultados (26 → página 1 con 24, botón de página 2), más un término con 0.
- [x] El header sigue mostrando los 4 links fijos de T30 en el estado de reposo — el buscador no rompió nada de esa tarea.

## Cómo se verificó

**Playwright real** (`frontend/t31-05-verificacion-final.mjs`, un solo org
descartable — 26 productos con un término (paginación), 1 con un término
único, y un término sin coincidencias — no toca datos de Eliathi, limpia
todo al final), en un único circuito de punta a punta:

1. Header en reposo: sigue mostrando exactamente los 4 links de T30.
2. Debounce real (tipeo letra por letra, no `.fill()`): 1 solo request de red.
3. Término único → 1 resultado → clic navega a la ficha correcta.
4. Término sin coincidencias → estado vacío + sugerencia de categoría real.
5. Término con 26 coincidencias → "Ver todos" → `/buscar` con el total real (26), página 1 con 24 resultados y botón de página 2 visible.
6. Mobile (390×844): el buscador abre como overlay de pantalla completa (`boundingBox` = viewport completo) y el resto del header (`.store-header`) sigue existiendo, sin romperse.
7. Cleanup: 0 filas huérfanas.

**11/11 PASS en la primera corrida.** `npx tsc --noEmit` limpio en `backend/` y `frontend/`.

## Definition of Done

- [x] Todos los ítems del checklist verificados en el navegador real.
- [x] Backend y frontend compilan limpio.

## Dependencias

- **La bloquean:** Tareas 1-4.
- **Bloquea:** nada — es la última tarea de T31.

## Cierre de T31_Buscador

Con esta tarea se completan las 5 tareas del plan:

- **Backend**: endpoint `GET /public/:slug/search`, búsqueda case-insensitive por nombre, sin filtros combinados (fuera de alcance v1).
- **Página de resultados**: sexto modo `"search"` en `CategoryPage.tsx` (no un componente nuevo) — en el camino se encontró y corrigió un bug real: el efecto de debounce de filtros borraba `?q=` de la URL por no preservarlo al reconstruirla.
- **Buscador vivo del header**: `SearchBar.tsx` nuevo, con debounce real, dropdown calcando `.account-dropdown`, y reuso de `navCategories` (ya cargado para el footer) para las sugerencias del estado vacío.
- **Overlay mobile**: sin componente nuevo — un solo `@media (max-width: 768px)` alcanzó, mismo componente y lógica que desktop.
- El header fijo de T30 (Inicio/Explorar/Novedades/Ofertas) quedó intacto en las tres tareas de frontend.
