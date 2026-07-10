# Tarea 2 — Endpoints públicos por slug (config, home, detalle)

**Estado:** ✅ Hecha (2026-07-08) — suite 20/20 PASS
**Depende de:** [01-catalog-config-completo.md](01-catalog-config-completo.md)

## Objetivo

Los primeros endpoints **sin auth** del proyecto: resuelven el tenant por el slug de la tienda y devuelven exclusivamente datos public-safe. Son la fuente de datos de la tienda (tarea 3) y, en T6, del carrito.

## Pasos

`backend/src/modules/public/routes.ts` (sin `requireAdminAuth`; `schema` Swagger con tag "público", sin `security`):

- [x] Helper `resolveStore(slug)`: config activa + org activa o **404 indistinguible**
- [x] `GET /public/:slug/config` — identidad pública, **sin orgId**
- [x] `GET /public/:slug/home` — secciones visibles con refs activos, productos public-safe filtrando `status != 'paused'`; la respuesta es directamente compatible con `HomeSectionsRenderer`
- [x] `GET /public/:slug/products/:id` — selects **explícitos** (los campos internos no pueden filtrarse por accidente); paused/oculto/de otra tienda → 404
- [x] Rate-limit anotado como pendiente en la hoja de ruta SaaS (endpoints públicos sin protección de abuso todavía)

## Definition of Done

- [x] Suite 20/20 **sin token**: config, home (orden comparado contra `home_sections` en DB), detalle con variantes e imágenes
- [x] **Contrato de seguridad por ausencia**: los bodies crudos de config/home/detalle no contienen `costPrice`, `stockLocal` ni `orgId`
- [x] Producto `paused` → fuera del home y 404 en detalle; `visibleInCatalog=false` → 404
- [x] Slug inexistente → 404; tienda desactivada → 404 (toggle + restore verificado)
- [x] Sección oculta → fuera del home público (toggle + restore)
- [x] Rutas en `/docs` (tag "público", sin candado); `tsc --noEmit` limpio

## Notas de ejecución (2026-07-08)

- Una corrida tuvo un fallo transitorio (respuesta no-array de un GET admin durante el test) que no se reprodujo — la suite completa pasó limpia al reintentar. Coincide con la lección de T2-03: ante un FAIL raro justo tras editar código, reintentar antes de debuggear.
