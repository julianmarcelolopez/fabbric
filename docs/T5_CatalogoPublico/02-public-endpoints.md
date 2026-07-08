# Tarea 2 — Endpoints públicos por slug (config, home, detalle)

**Estado:** ⬜ Pendiente
**Depende de:** [01-catalog-config-completo.md](01-catalog-config-completo.md)

## Objetivo

Los primeros endpoints **sin auth** del proyecto: resuelven el tenant por el slug de la tienda y devuelven exclusivamente datos public-safe. Son la fuente de datos de la tienda (tarea 3) y, en T6, del carrito.

## Pasos

`backend/src/modules/public/routes.ts` (sin `requireAdminAuth`; `schema` Swagger con tag "público", sin `security`):

- [ ] Helper `resolveStore(slug)`: busca `catalog_configs` por slug con `active=true` y org `active=true` → 404 indistinguible si falla cualquiera de las tres condiciones
- [ ] `GET /public/:slug/config` — storeName, logoUrl, accentColor, theme, businessDescription (nada interno: sin orgId… evaluar; el orgId no daña pero no aporta — no exponerlo)
- [ ] `GET /public/:slug/home` — las secciones del home **visibles** con refs **activos**, cada una con sus productos public-safe (id, name, price, imageUrl) — misma lógica que el GET admin de T3 pero filtrando `status != 'paused'` además de `visibleInCatalog`
- [ ] `GET /public/:slug/products/:id` — detalle public-safe: name, description, price, status, images (url + orden), variants (id, talle, color, priceOverride, **stockOnline** — jamás stockLocal), **jamás costPrice**; producto paused/oculto/de otra tienda → 404
- [ ] Rate-limit u otras protecciones: fuera de alcance (anotar para la hoja de ruta SaaS — endpoints públicos sin protección de abuso)

## Definition of Done

- [ ] Suite HTTP **sin token**: config OK; home refleja orden/visibilidad de las secciones (comparar contra el estado real en DB); detalle OK con variantes
- [ ] **Contrato de seguridad verificado por ausencia**: los JSON de home y detalle no contienen las claves `costPrice` ni `stockLocal` (búsqueda literal en el body crudo)
- [ ] Producto `paused` no aparece en el home ni responde en detalle (404); `visibleInCatalog=false` ídem
- [ ] Slug inexistente → 404; config con `active=false` → 404 (probar toggleando la de demo y restaurando)
- [ ] Sección oculta o de ref inactivo no aparece en `/home` público
- [ ] Rutas en `/docs`; `tsc --noEmit` limpio
