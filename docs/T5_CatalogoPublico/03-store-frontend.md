# Tarea 3 — La tienda: layout + portada + detalle de producto

**Estado:** ⬜ Pendiente
**Depende de:** [02-public-endpoints.md](02-public-endpoints.md)

## Objetivo

Reemplazar el placeholder de `/store/:slug` por la tienda real de solo lectura, reutilizando los componentes presentacionales que ya existen — la promesa de T2/T3 ("lo que ves en el preview es lo que ve el comprador") se cumple acá.

## Pasos

`frontend/src/features/store/`:

- [ ] `StoreLayout.tsx` — resuelve el slug (fetch `/public/:slug/config`), aplica `accentColor` (CSS custom property), TopBar con logo/nombre, footer con descripción; slug inexistente → página "tienda no encontrada" amigable
- [ ] `CatalogHomePage.tsx` — fetch `/public/:slug/home` → `HomeSectionsRenderer` (el de T3, sin tocar) con `onProductClick` navegando al detalle
- [ ] `StoreProductPage.tsx` — fetch `/public/:slug/products/:id` → `ProductDetailView` (el de T2, sin tocar): galería, talles/colores, stock online, precio efectivo. Sin `onAddToCart` (llega en T6) — el botón queda deshabilitado con su texto actual
- [ ] Rutas: `/store/:slug` (portada) y `/store/:slug/p/:productId` (detalle), SIN `RequireAuth`
- [ ] Estados de carga y error propios de tienda (no estética admin) en `catalog.css`

## Definition of Done

- [ ] Typecheck limpio; Vite compila; módulos servidos
- [ ] `/store/demo` **en ventana de incógnito** (sin sesión) muestra la portada real con las secciones en el orden configurado
- [ ] Click en un producto → detalle completo con selector de variantes funcionando
- [ ] La verificación fina queda para la tarea 4
