# Tarea 4 — `HomeSectionsRenderer` + preview en vivo del home

**Estado:** ✅ Hecha (2026-07-08) — verificada en navegador por el usuario
**Depende de:** [03-home-sections-page.md](03-home-sections-page.md)

## Objetivo

El segundo nivel del "preview en vivo" del plan (el primero fue el de producto en T2): mientras el vendedor arrastra/oculta secciones, ve al lado exactamente cómo queda la portada de su tienda. `HomeSectionsRenderer` es presentacional puro y lo reutiliza `CatalogHomePage` (la tienda real) en T5 — es uno de los "archivos críticos" del plan.

## Pasos

- [x] `HomeSectionsRenderer.tsx` — presentacional puro (cero fetch): título + grilla de `ProductCard` por sección. Reglas de render: solo `visible && refActive && refName != null && products.length > 0`; acepta `onProductClick?` para que la tienda (T5) navegue al detalle.
- [x] `HomeSectionsPage`: split pane `.editor-split` con el renderer alimentado del **estado local** — el drag reordena en vivo y el toggle visible pasó a ser **optimista** (rollback si el PATCH falla), así el preview reacciona antes de que el servidor confirme
- [x] Estilos `.hsr-*` en `catalog.css` (estética de tienda)

## Definition of Done

Verificado por terminal (2026-07-08): typecheck limpio; Vite compila y sirve ambos módulos; el renderer no importa `lib/api` (solo props — revisable por código).

Verificado en navegador por el usuario (2026-07-08):
- [x] Arrastrar una sección mueve el bloque en el preview al instante
- [x] Toggle visible la hace aparecer/desaparecer del preview sin recargar
- [x] Cada sección muestra sus productos con imagen y precio
- [x] Consola sin errores
