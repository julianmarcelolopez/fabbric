# 09 — Scroll horizontal en las tablas del admin (mobile)

## Qué se cambia

Todas las tablas del admin (`table.grid`) se envuelven en un contenedor con `overflow-x: auto`, para que en pantallas angostas la tabla se pueda desplazar horizontalmente en vez de romperse o recortarse silenciosamente (`overflow: hidden` como está hoy).

## Referencia visual

Pantalla 2 (Productos), tab "Stock" — el mockup ya envuelve esa tabla específica en un contenedor `overflow-x:auto` con `min-width: 600px` en la tabla interna, como referencia concreta del patrón a aplicar en el resto de las tablas del admin (Pedidos, Finanzas, Clientes, Categorías/Colecciones si siguen siendo tablas después de `02`).

## Referencia en T18

- `05-mobile.md` 🔴 — "Las tablas del admin no tienen scroll horizontal ni alternativa de tarjetas" — **inferido leyendo el CSS, no observado en dispositivo real** (ver método en `T18_UX-Revision/README.md`). El propio hallazgo lo marca como quick win de bajo riesgo — se puede aplicar incluso sin verificación previa en dispositivo real, porque `overflow-x: auto` no cambia nada visible en desktop.

## Archivos a modificar

- `frontend/src/features/admin/admin.css` — agregar una clase contenedora (ej. `.table-scroll { overflow-x: auto; }`) o ajustar `table.grid` directamente si se prefiere aplicarlo de forma global.
- Cada página que usa `<table className="grid">` necesita envolver la tabla con el nuevo contenedor: `ProductsPage.tsx` (o su versión con tabs si `02` ya está hecha), `OrdersPage.tsx`, `OrderAdminDetailPage.tsx` (si tiene tablas), `FinanzasPage.tsx`, `CustomersPage.tsx`, `TaxonomyManager.tsx`, `ShippingZonesPage.tsx`, `StockPage.tsx` (o su tab equivalente).

## Criterio de completado

- Todas las tablas listadas tienen el wrapper aplicado.
- `tsc --noEmit` limpio; verificado que en desktop no cambia nada visualmente.
- Verificado en un iPhone real o en Chrome DevTools a 390px: las tablas permiten scroll horizontal en vez de recortarse o desbordar la página entera.

## Notas

- Cambio de bajo riesgo y bajo esfuerzo — es candidato a moverse a Sprint 1 si se quiere adelantar, aunque quedó en Sprint 3 en el plan de `06-ux-review.md` por estar agrupado con el resto de los hallazgos de mobile (pendientes de verificación real antes de invertir en el sidebar colapsable de `01`). Esta tarea puntual no depende de esa verificación.
- No reemplaza la mejora estructural de "vista de tarjetas para Stock y Pedidos en mobile" que quedó anotada en el Sprint 3 de `06-ux-review.md` — esta tarea es el arreglo rápido, no el rediseño de fondo.
