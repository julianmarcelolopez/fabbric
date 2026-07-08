# Tarea 6 — Preview en vivo a nivel producto (split pane)

**Estado:** ✅ Hecha (2026-07-08) — verificada en navegador por el usuario
**Depende de:** [05-admin-catalogo-frontend.md](05-admin-catalogo-frontend.md)

## Objetivo

El primer nivel del "preview en vivo" del plan: mientras el vendedor edita un producto, ve al lado cómo queda en la tienda — **sin guardar primero**. El componente presentacional es el mismo que va a usar la tienda pública en T5, así que lo que se ve en el preview es exactamente lo que verá el comprador.

## Pasos

- [x] `frontend/src/features/catalog/ProductDetailView.tsx` — presentacional puro: todo por props, **cero fetch**. Único estado interno: la selección efímera del visitante (imagen activa, talle, color) — es view-state, no data-state. Acepta `onAddToCart?` opcional: la tienda (T5) lo pasa; el preview lo omite y el botón queda deshabilitado con textos según el caso ("Elegí talle y color", "Sin stock", etc.).
- [x] `frontend/src/features/catalog/ProductCard.tsx` — card presentacional para grillas (preview del home en T3 y tienda en T5)
- [x] `catalog.css` propio (prefijos `pdv-`/`pcard`) — estilos de tienda, independientes del admin
- [x] `ProductEditPage`: split pane `.editor-split` (form izquierda / preview sticky derecha, colapsa a una columna en pantallas angostas). El preview se alimenta del **estado del formulario** (nombre, descripción, precio parseado en vivo — si el precio tipeado es inválido cae al persistido); variantes e imágenes vienen del último estado guardado.
- [x] Selector talle→color en el preview con precio efectivo (`priceOverride ?? price`) y stock online ("¡Últimas N!", "Sin stock online")
- [x] Imágenes: galería con thumbnails seleccionables usando el orden actual del editor

## Definition of Done

Verificado por terminal (2026-07-08): typecheck limpio; Vite compila y sirve los 3 módulos nuevos; `ProductDetailView` no importa `lib/api` (solo props — revisable por código).

Verificado en navegador por el usuario (2026-07-08):
- [x] Tipear nombre/descripción/precio actualiza el preview sin guardar
- [x] Cambiar talle/color muestra precio efectivo y stock de esa variante
- [x] Reordenar imágenes se refleja en el preview
- [x] Consola sin errores
