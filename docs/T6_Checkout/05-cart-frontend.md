# Tarea 5 — Carrito client-side + drawer + botón "Agregar" real

**Estado:** ✅ Hecha (2026-07-09) — verificada en navegador por el usuario
**Depende de:** [02-schema-checkout.md](02-schema-checkout.md)

## Objetivo

El carrito de la tienda: client-side (localStorage por tienda), sin backend — el server recién valida en el checkout (tarea 6). El botón deshabilitado de T5 cobra vida.

## Pasos

- [x] `CartContext.tsx` — localStorage por slug (`fabbric-cart:<slug>`), add/remove/setQty/clear, subtotal y count derivados, qty capeada al `stockOnline` conocido; agregar abre el drawer
- [x] `CartDrawer.tsx` — panel lateral con overlay: miniatura, variante, +/− (con tope de stock), quitar, subtotal, "el envío se calcula en el checkout", CTA → `/store/:slug/checkout` (placeholder hasta la tarea 6)
- [x] Topbar: botón 🛒 con contador
- [x] `PdvVariant` ganó `id?` y la tienda pasa `onAddToCart` real (precio efectivo `priceOverride ?? price`); el preview del admin sigue sin handler → botón deshabilitado
- [x] Precios informativos: el server recalcula en el checkout (comentado en el código)

## Definition of Done

- [x] Typecheck limpio; Vite compila y sirve los módulos
- [x] En navegador: carrito funcionando OK (usuario, 2026-07-09)
