# Tarea 3 — Zonas de envío: CRUD admin + página + GET público

**Estado:** ✅ Hecha (2026-07-09) — suite 11/11 PASS
**Depende de:** [02-schema-checkout.md](02-schema-checkout.md)

## Objetivo

Envíos v1 según el plan: zonas con costo fijo y envío gratis desde un monto — patrón heredado de byos-platform. El admin las configura; el checkout las ofrece.

## Pasos

- [x] `modules/shippingZones/routes.ts`: CRUD completo scoped por org, con Swagger; DELETE libre (snapshot en órdenes)
- [x] `GET /public/:slug/shipping-zones` (en el módulo público, reusa `resolveStore`) — solo activas, sin `orgId` ni flags internos
- [x] `ShippingZonesPage.tsx` en `/admin/shipping` (sidebar "Envíos"): tabla con precios formateados + alta + edición inline + toggle + borrar con aviso de snapshot
- [x] Suite 11/11: CRUD, validación (costo negativo → 400), público solo-activas y sin campos internos, aislamiento entre orgs

## Definition of Done

- [x] Suite en verde; rutas en `/docs`; `tsc --noEmit` limpio
- [ ] En navegador: crear las 2 zonas reales (ej. "CABA" $2500, "GBA" $4000 gratis desde $50.000) — queda para la E2E (tarea 9), la página ya está lista
