# Tarea 2 — Precio tachado en admin y tienda

**Estado:** ✅ Completada (2026-07-24) — verificada en navegador en tarea 3 (con una corrección de font-size en `.pcard-price-original`)
**Depende de:** [01-schema-y-endpoints.md](01-schema-y-endpoints.md)

## Objetivo

Que Edgar pueda cargar el precio anterior desde el admin, y que se vea tachado junto al precio final en la tienda pública — igual que en su catálogo de WhatsApp.

## Pasos

`ProductCard` y `ProductDetailView` no reciben datos por sí solos — hay una cadena de tipos y callers que hay que actualizar completa, o el tachado solo aparece en algunos lugares y no en otros:

**Componentes presentacionales (el tachado en sí):**
- [x] `frontend/src/features/catalog/ProductCard.tsx`: sumar `compareAtPrice: number | null` a `Props`; si `compareAtPrice > price`, mostrar el precio anterior tachado antes del precio final. Si es `null` o `<= price`: igual que hoy.
- [x] `frontend/src/features/catalog/ProductDetailView.tsx`: mismo tratamiento (`Props` + render condicional).

**Cadena del home** (`ProductCard` no tiene otro caller que este — lo usan tanto el preview del admin como la tienda pública real, mismo componente):
- [x] `frontend/src/features/catalog/HomeSectionsRenderer.tsx`: sumar `compareAtPrice: number | null` al tipo local `HsrSection.products[]`; pasar `compareAtPrice={p.compareAtPrice}` en el `<ProductCard>` dentro del `.map()`.
- [x] `frontend/src/features/admin/types.ts`: sumar `compareAtPrice` a `HomeSectionItem.products[]` (alimenta el preview de `HomeSectionsPage`, T3).
- [x] `frontend/src/features/store/types.ts`: `PublicHomeSection` ya es un alias de `HsrSection` — no necesita cambio propio una vez arreglado el punto anterior.

**Cadena del detalle de producto** (dos callers independientes de `ProductDetailView`, cada uno con su propio tipo):
- [x] `frontend/src/features/admin/types.ts`: `compareAtPrice: number | null` en `ProductBase` (alimenta `ProductEditPage`).
- [x] `ProductEditPage.tsx`: campo "Precio anterior (opcional)" en el formulario (mismo patrón pesos↔centavos de `lib/money.ts`) — **y** pasar ese valor del form al `<ProductDetailView compareAtPrice={...} />` del panel de preview en vivo (hoy usa `previewPrice` del estado local, no el producto guardado — es fácil actualizar el campo del form y olvidarse de threadearlo al preview).
- [x] `frontend/src/features/store/types.ts`: `compareAtPrice: number | null` en `PublicProductDetail`.
- [x] `StoreProductPage.tsx`: pasar `compareAtPrice={product.compareAtPrice}` al `<ProductDetailView>` (hoy pasa `name`/`description`/`price`/`images`/`variants` explícitos — es una prop más en esa misma lista).

## Definition of Done

- [x] `tsc --noEmit` limpio en los 3 workspaces; `vite build` compila sin errores.
- [x] **Dato verificado de punta a punta** (backend local contra la DB real, sin Docker): con "Remera Boxy Fit Roja" en `compareAtPrice=2000000`, el campo llega correcto a `/public/demo/home`, `/public/demo/products/:id`, `/admin/home-sections` **y** `/admin/products/:id` — los 4 endpoints que alimentan los 4 lugares visuales. Encontré y corregí en el camino que `homeSections/routes.ts` tenía su propio select paralelo sin el campo (ver corrección en tarea 1).
- [ ] **Falta la verificación visual real** (el tachado se ve bien en pantalla, con la tipografía/color correctos) — eso es responsabilidad del navegador del usuario, no algo que pueda confirmar por HTTP → tarea 3.

## Nota de implementación

`ProductDetailView` prioriza `priceOverride` de variante sobre `compareAtPrice`: si hay una variante seleccionada con precio propio, el tachado se oculta (no se combinan) — decisión ya anotada en el README de T11.

