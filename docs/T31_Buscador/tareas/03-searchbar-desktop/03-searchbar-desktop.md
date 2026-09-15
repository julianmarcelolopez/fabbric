# Tarea 3 — Frontend: buscador vivo en el header (desktop)

**Estado:** ✅ Hecha — verificada con Playwright real (14/14 PASS).

**Depende de:** Tarea 1 (necesita el endpoint). No depende de la Tarea 2.

## Objetivo (según `plan.md`, T31/03)

El ícono de lupa deja de ser decorativo — clic lo expande a un campo de
texto con resultados en vivo, calcando el patrón mostrado en
`mockups/buscador.html` (estado 02).

## Pasos

- [x] `frontend/src/features/store/components/SearchBar.tsx` (nuevo) — estado local (`q`, `results`, `loading`), debounce 300ms con guard `cancelled` (mismo patrón que `CustomersPage.tsx:14-32`).
- [x] `StoreLayout.tsx` — `searchOpen` levantado a este componente (no vive dentro de `SearchBar`) porque afecta a 3 hermanos del mismo `store-header-inner`: oculta `<nav>`, oculta `ShareButton`/`AccountButton`, y `<SearchBar>` decide su propio contenido (ícono vs. campo). El botón `disabled` de T20/02 desapareció.
- [x] Dropdown de resultados — clases nuevas en `catalog.css`, calcando el lenguaje visual de `.account-dropdown` (posición, sombra, z-index) en vez de inventar un patrón nuevo.
- [x] Estado "sin resultados" — mensaje directo + hasta 3 categorías sugeridas, reusando `navCategories` que `StoreLayout.tsx` ya cargaba para el footer (sin fetch nuevo).
- [x] Link "Ver todos los resultados para «…»" → navega a `/store/:slug/buscar?q=...` (Tarea 2).
- [x] Cierre: botón ✕ dentro del campo, click afuera (listener en `document`), y tecla Escape.
- [x] Foco automático al expandirse (`inputRef.current?.focus()` en un efecto sobre `open`).

## Cómo se verificó

**Playwright real** (`frontend/t31-03-searchbar-desktop.mjs`, viewport
1280×900, org descartable con una categoría real (para la sugerencia) y 2
productos que matchean un término — no toca datos de Eliathi, limpia todo
al final):

1. Reposo: nav de 4 links visible, botón de buscar ya no `disabled`.
2. Clic → el nav desaparece, el campo aparece con foco automático, Compartir/Cuenta se ocultan y el Carrito sigue visible (igual que el mockup).
3. Con 1 carácter no aparece dropdown (mínimo 2, según la propuesta).
4. Escribiendo el término completo (tecla por tecla, no `.fill()`, para simular tipeo real) — **un solo request** al backend gracias al debounce, confirmado contando las requests de red, no solo visualmente.
5. El dropdown muestra los productos reales que matchean.
6. Clic en un resultado navega directo a la ficha de ese producto.
7. Término sin coincidencias → mensaje directo + la categoría real sugerida (no `[]` vacío ni sugerencias inventadas).
8. "Ver todos los resultados" navega a `/buscar?q=...` con el término correcto.
9. Escape cierra el buscador y el nav vuelve a aparecer.
10. Cleanup: 0 filas huérfanas.

**14/14 PASS** (un ajuste de selector en el script en el camino — "Categoria Sugerida" aparecía 3 veces en la página real, no solo en la sugerencia del dropdown, así que el chequeo se acotó a `.search-dropdown-suggested`; no era un bug de la app). `npx tsc --noEmit` limpio en `backend/` y `frontend/`.

## Definition of Done

- [x] La lupa ya no es `disabled` — abre el campo expandido con foco automático.
- [x] Resultados en vivo con debounce real, estado de carga y estado sin-resultados con sugerencias.
- [x] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 1.
- **Bloquea:** Tarea 4 (el overlay mobile es una variante de este mismo comportamiento).
