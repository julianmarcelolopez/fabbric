# Tarea 2 — Marca en admin y tienda

**Estado:** ✅ Completada (2026-07-24) — verificada en navegador en tarea 3, sin defectos
**Depende de:** [01-schema-y-endpoints.md](01-schema-y-endpoints.md)

## Objetivo

Que Edgar pueda cargar la marca de cada producto, sugerida pero no restringida, y que se vea junto al nombre en la tienda.

## Pasos

**Componentes presentacionales:**
- [x] `frontend/src/features/catalog/ProductCard.tsx`: `brand?: string | null` en `Props`; se muestra como línea chica en mayúsculas arriba del nombre (`.pcard-brand`) cuando está cargada.
- [x] `frontend/src/features/catalog/ProductDetailView.tsx`: mismo tratamiento (`.pdv-brand`, arriba del `<h3>`).

**Cadena del home:**
- [x] `frontend/src/features/catalog/HomeSectionsRenderer.tsx`: `brand` sumado al tipo local `HsrSection.products[]`; pasado en el `<ProductCard>` del `.map()`.
- [x] `frontend/src/features/admin/types.ts`: `brand` sumado a `HomeSectionItem.products[]`.

**Cadena del detalle de producto:**
- [x] `frontend/src/features/admin/types.ts`: `brand: string | null` en `ProductBase`; constante `SUGGESTED_BRANDS` (Taverniti, Bross, Adidas, Puma, Eliathi Modas).
- [x] `ProductEditPage.tsx`: campo "Marca" (junto a Nombre/Categoría) con `list`/`datalist` de `SUGGESTED_BRANDS`, `maxLength={60}` — vacío se manda como `null` (`form.brand.trim() === "" ? null : form.brand.trim()`), threadeado también al `<ProductDetailView>` del preview en vivo.
- [x] `frontend/src/features/store/types.ts`: `brand: string | null` en `PublicProductDetail`.
- [x] `StoreProductPage.tsx`: `brand={product.brand}` pasado al `<ProductDetailView>`.

## Definition of Done

- [x] `tsc --noEmit` limpio en los 3 workspaces; `vite build` compila sin errores.
- [x] Dato verificado de punta a punta en tarea 1 (los 4 endpoints ya prueban que `brand` llega correcto a donde tiene que llegar) — lo que falta acá es la UI en sí, verificada por HTML/CSS presentes (no ejecutado en navegador por mí).
- [ ] **Falta la verificación visual real** (se ve bien, en los 4 lugares, con y sin marca cargada) → tarea 3.

## Nota de implementación

`.pcard-brand`/`.pdv-brand`: texto chico, gris, mayúsculas, mismo tratamiento visual que las etiquetas de sección (`.pdv-label`) ya existentes — consistente con el resto del catálogo, no un estilo nuevo inventado.
