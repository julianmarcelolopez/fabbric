# Tarea 3 — La tienda: layout + portada + detalle de producto

**Estado:** ✅ Hecha (2026-07-08) — verificada en navegador por el usuario
**Depende de:** [02-public-endpoints.md](02-public-endpoints.md)

## Objetivo

Reemplazar el placeholder de `/store/:slug` por la tienda real de solo lectura, reutilizando los componentes presentacionales que ya existen — la promesa de T2/T3 ("lo que ves en el preview es lo que ve el comprador") se cumple acá.

## Pasos

`frontend/src/features/store/`:

- [x] `StoreLayout.tsx` — fetch de config pública, `--accent` como CSS custom property (topbar, botón de compra y links la usan), TopBar con logo/nombre, footer con descripción + "tienda creada con fabbric"; 404 → "Tienda no encontrada" amigable
- [x] `CatalogHomePage.tsx` — `HomeSectionsRenderer` de T3 **sin tocar** (la respuesta pública ya es compatible), `onProductClick` navega al detalle
- [x] `StoreProductPage.tsx` — `ProductDetailView` de T2 **sin tocar**, sin `onAddToCart` (botón deshabilitado hasta T6); producto inexistente → "no encontrado" con link de vuelta
- [x] Rutas anidadas `/store/:slug` + `/store/:slug/p/:productId`, sin auth; placeholder de T0 eliminado
- [x] Estilos `.store-*` en `catalog.css`; helper `publicJson` (fetch sin token) en `lib/api.ts`

## Definition of Done

- [x] Typecheck limpio; Vite compila y sirve los 3 módulos; `/store/demo` responde por el fallback SPA
- [x] Verificación en navegador → tarea 4 (OK del usuario)
