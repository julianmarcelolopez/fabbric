# Tarea 3 — Header: nav fija

**Estado:** ✅ Hecha — verificada con Playwright real (9/9 PASS).

**Depende de:** Tarea 2 (las rutas `/novedades` y `/ofertas` tienen que existir antes de linkear a ellas).

## Objetivo (según `plan.md`, T30/03)

Reemplazar la nav dinámica del header por los 4 links fijos
(Inicio/Explorar/Novedades/Ofertas), sin tocar el footer.

## Pasos

- [x] `StoreLayout.tsx` — el `<nav className="store-nav">` que mapeaba `navCategories` + "Ver todo" se reemplazó por los 4 `<NavLink>` fijos.
- [x] `end` en el `NavLink` de "Inicio" — sin él, `NavLink` matchea por prefijo y quedaría marcado activo también en `/categorias`, `/novedades` y `/ofertas` (todas empiezan con `/store/:slug`). Confirmado con Playwright que sin `end` esto se rompía.
- [x] El `useState`/`useEffect` que carga `navCategories` **no se tocó** — sigue usándose en el footer.
- [x] Sin cambios en el footer — confirmado que sigue mostrando las categorías reales tal cual.

## Cómo se verificó

**Playwright real** (`frontend/t30-03-header-nav-fija.mjs`, dos orgs descartables — una con 2 categorías reales en el home, otra sin ninguna — no tocan datos de Eliathi, limpian todo al final):

1. Org con categorías: el header muestra exactamente "Inicio Explorar Novedades Ofertas" — **no** los nombres de las categorías del tenant (antes sí los mostraba).
2. En cada una de las 4 páginas (`/`, `/categorias`, `/novedades`, `/ofertas`), el link correspondiente queda resaltado activo — confirmado que "Inicio" **no** queda marcado activo estando en las otras tres (el caso que rompía sin `end`).
3. El footer sigue mostrando "Remeras PW" y "Pantalones PW" (las categorías reales), sin cambios.
4. Org sin ninguna categoría: el header muestra exactamente el mismo texto — ya no depende de `navCategories`. El footer, en cambio, no muestra la columna "Tienda" (comportamiento previo, sin cambios, porque ese guard sigue intacto).
5. Cleanup: 0 filas huérfanas.

**9/9 PASS en la primera corrida** (nota de implementación del script: `catalog.css` pone `text-transform: uppercase` en `.store-nav a`, así que `innerText()` devuelve el texto en mayúsculas — el script compara en minúsculas para no depender de eso). `npx tsc --noEmit` limpio en `backend/` y `frontend/`.

## Definition of Done

- [x] El header muestra siempre los mismos 4 links, sin importar cuántas categorías tenga el tenant.
- [x] El link activo se resalta correctamente en las 4 páginas principales.
- [x] El footer sigue mostrando las categorías reales, sin cambios.
- [x] `npx tsc --noEmit` limpio en `frontend/`.

## Dependencias

- **La bloquean:** Tarea 2.
- **Bloquea:** Tarea 4 (verificación final).
