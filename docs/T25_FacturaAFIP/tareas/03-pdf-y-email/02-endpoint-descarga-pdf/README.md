# Tarea 2 — `GET /admin/invoices/:id/pdf`

**Estado:** ✅ Hecha (2026-09-06) — verificado con `t25-04-invoice-pdf-download.mjs` (11/11 PASS)

**Depende de:** Tarea 1 (generación del PDF)

## Objetivo

Exponer el PDF de una factura ya `emitida` para que la PWA lo pueda descargar.

## Pasos

- [x] Endpoint `GET /admin/invoices/:id/pdf` en `backend/src/modules/invoices/routes.ts`, `requireAdminAuth` + `requireOrgId`.
- [x] 404/409 resueltos **sin duplicar lógica**: `generarInvoicePdf` (Tarea 1) ya tira `AppError(404)`/`AppError(409)`, y el `setErrorHandler` global los traduce — el handler de la ruta no necesita sus propios checks.
- [x] Genera el PDF on-demand (sin cachear, se descartó por innecesario: es liviano y de bajo volumen — ver nota en Tarea 1).
- [x] `Content-Type: application/pdf` + `Content-Disposition: attachment; filename="factura-PPPP-NNNNNNNN.pdf"` (se extendió `generarInvoicePdf` para devolver también el nombre sugerido, ya que el número formateado se calculaba ahí adentro igual).

## Definition of Done

- [x] Descargar el PDF de una factura `emitida` funciona (verificado con `fetch` simple, magic bytes `%PDF` confirmados, no solo "no tira error").
- [x] Pedir el PDF de una factura ajena a la organización devuelve 404.
- [x] Pedir el PDF de una factura no emitida devuelve 409, no un PDF vacío o roto.
- [x] Factura inexistente → 404.

## Dependencias

- **La bloquean**: Tarea 1 — ya resuelta.
- **Bloquea**: Fase 5 (la PWA usa este endpoint para el botón "Descargar factura"). **Desbloqueada.**
