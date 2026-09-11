# Tarea 3 — `POST /admin/invoices/:id/retry`

**Estado:** ✅ Hecha (2026-09-03) — verificado con `t25-03-invoice-retry.mjs` (9/9 PASS)

**Depende de:** Tarea 2 (extender `venta-local`)

## Objetivo

Dar una forma de reintentar una factura que quedó en `error` (o `pendiente` sin resolver, ej. por un corte del backend a mitad de camino), sin tener que anular y rehacer la venta.

## Pasos

- [x] Endpoint nuevo `POST /admin/invoices/:id/retry` en `backend/src/modules/invoices/routes.ts`, `requireAdminAuth` + `requireOrgId`, registrado en `index.ts`.
- [x] Busca la factura por `id` dentro de la organización; 404 si no existe o es de otra org.
- [x] Si ya está `emitida`, devuelve 409 sin volver a llamar a AFIP.
- [x] Si está `pendiente`/`error`: reusa `intentarEmision` (`invoices/service.ts`, la misma función que usa `venta-local` desde la Tarea 2 — cero duplicación).

## Definition of Done

- [x] Reintentar una factura `error` con AFIP respondiendo bien la deja `emitida` con CAE real.
- [x] Reintentar una factura ya `emitida` devuelve 409, y el número de comprobante no cambia (confirma que no se volvió a llamar a AFIP).
- [x] Aislamiento por organización verificado: reintentar la factura de otra org devuelve 404 (no 403 — mismo criterio que el resto del admin).
- [x] Factura inexistente → 404.

## Dependencias

- **La bloquean**: Tarea 2 — ya resuelta.
- **Bloquea**: Fase 6 (el admin de escritorio llama a este endpoint desde el botón "Reintentar"). **Desbloqueada.**
