# Tarea 4 — Frontend: overlay mobile

**Estado:** ✅ Hecha — verificada con Playwright real (6/6 PASS).

**Depende de:** Tarea 3 (es una variante del mismo comportamiento — reusa el estado/lógica, cambia la presentación).

## Objetivo (según `plan.md`, T31/04)

En mobile (breakpoint 768px, mismo que usa el resto de la tienda desde T20),
la lupa abre un buscador de pantalla completa en vez de expandir in-place —
el header no tiene espacio para eso.

## Decisión tomada al implementar: sin componente nuevo

La propuesta original y `plan.md` dejaban abierta la duda entre un
componente separado (`SearchOverlayMobile.tsx`) o una variante del mismo
`SearchBar.tsx`. **Se resolvió sin tocar ni una línea de JS/TSX**: el
`.search-result-item` de la Tarea 3 ya era una lista vertical (thumb+nombre+
precio) — lo único que cambiaba entre "dropdown angosto" y "overlay de
pantalla completa" era **posicionamiento y tamaño**, ambos puramente CSS.
Se agregó un solo `@media (max-width: 768px)` en `catalog.css` que:

- `.search-field-wrap` pasa de `position: relative; max-width: 480px` a `position: fixed; inset: 0` — de "franja que crece en el header" a "tapa la pantalla entera".
- `.search-field` pierde el borde redondeado y se convierte en una barra superior.
- `.search-dropdown` pasa de panel flotante (`position: absolute`, `max-height: 70vh`) a `position: static; flex: 1` — ocupa el alto real del overlay en vez de un recorte con scroll.
- El input sube a `font-size: 16px` en mobile (14px en desktop) — evita que iOS Safari le aplique auto-zoom a un input enfocado con `font-size` menor a 16px, lo que rompería el layout del overlay.

`SearchBar.tsx` (Tarea 3) no se tocó — mismo componente, mismo estado, mismo
fetch/debounce, en las dos plataformas.

## Pasos

- [x] CSS responsive en `catalog.css`, sin componente nuevo (ver decisión arriba).
- [x] Input arriba con foco automático (ya lo hacía la Tarea 3, se hereda sin cambios), resultados como lista vertical, botón de cerrar visible (el mismo ✕ del campo).
- [x] Mismo debounce/fetch/estados que la Tarea 3 — literal el mismo código, cero duplicación.
- [x] Breakpoint 768px, el mismo que usa el resto de la tienda (no uno nuevo).

## Cómo se verificó

**Playwright real** (`frontend/t31-04-overlay-mobile.mjs`, viewport 390×844
para mobile + 1280×900 para la regresión de desktop, org descartable — no
toca datos de Eliathi, limpia todo al final):

1. Mobile: al abrir el buscador, `.search-field-wrap` mide exactamente el viewport completo (390×844) y su `position` computado es `fixed` — confirmado tanto por `boundingBox()` como por `getComputedStyle`.
2. La lista de resultados es `position: static` (parte del overlay, no un panel flotante).
3. Clic en un resultado navega a la ficha del producto, igual que en desktop.
4. **Regresión**: en viewport de desktop (1280px), `.search-field-wrap` sigue siendo `position: relative` (el comportamiento in-place de la Tarea 3 no se rompió).
5. Cleanup: 0 filas huérfanas.

**6/6 PASS en la primera corrida.** `npx tsc --noEmit` limpio en `backend/` y `frontend/`.

## Definition of Done

- [x] En mobile, la lupa abre un overlay de pantalla completa con el mismo comportamiento que el desktop.
- [x] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 3.
- **Bloquea:** Tarea 5 (verificación final).
