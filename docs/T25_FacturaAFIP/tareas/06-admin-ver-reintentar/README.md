# Fase 6 — Admin de escritorio: ver y reintentar facturas con error

**Estado:** ✅ Hecha (2026-09-11) — 12/12 PASS (Playwright, admin de escritorio real)

## Objetivo (según plan.md)

Que Edgar (o quien administre desde el escritorio) pueda ver el estado de la factura de un pedido y resolver los casos que quedaron en `error` sin tener que tocar la base a mano.

## Checklist

- [x] `frontend/src/features/admin/pages/OrderAdminDetailPage.tsx`: componente nuevo `InvoiceCard`, muestra estado (`emitida`/`pendiente`/`error`) + número/CAE/vencimiento si ya está emitida.
- [x] Si está en `error`: botón "Reintentar" contra `POST /admin/invoices/:id/retry`, con `invoice.mensajeError` visible.
- [x] Si está `emitida`: botón "Descargar factura (PDF)" (mismo backend que la PWA).
- [x] No se creó pantalla nueva — la tarjeta vive en el detalle del pedido existente.

## Cómo se implementó

- **Backend**: `GET /admin/orders/:id` (`orders/routes.ts`) se extendió con un `leftJoin` a `invoices` (a lo sumo una fila por pedido, por la constraint de unicidad de la Fase 2) — el detalle del pedido ahora incluye `invoice: InvoiceStatus | null` en una sola llamada, sin necesidad de un segundo endpoint ni de que el frontend conozca el `invoiceId` de antemano.
- **Frontend**: `apiDownload` nuevo en `frontend/src/lib/api.ts` — no existía (la PWA sí lo tenía desde la Fase 5); mismo patrón `<a download>` con Bearer. Tipo `AdminInvoiceStatus` agregado a `types.ts` **mirroreado a mano** (no importado de `@fabbric/shared`), seteo mismo criterio que ya usa ese archivo para todo lo demás.
- `InvoiceCard` reusa el `load()` que ya tenía la página para recargar el pedido después de cualquier acción (mismo patrón que "Cobrar"/transiciones de estado) — el reintento exitoso actualiza la tarjeta sola, sin `location.reload()`.

## Definition of Done

- [x] Un pedido sin factura no muestra ninguna sección nueva — verificado explícitamente, no asumido.
- [x] Reintentar desde el admin una factura en `error` la deja `emitida` sin recargar la página — verificado que el botón "Reintentar" desaparece y el de "Descargar factura (PDF)" aparece solo, en el mismo DOM sin navegación.

## Cómo se verificó

**Playwright** (`frontend/t25-06-admin-factura.mjs`, admin de escritorio real en `localhost:5173`) — 12/12 PASS:
- Pedido sin factura: la tarjeta "Factura AFIP" no aparece.
- Pedido con factura en `error` (org de prueba sin config AFIP): mensaje de error real visible, botón "Reintentar", sin botón de descarga.
- Se le carga la config AFIP real de Eliathi a la org de prueba (simula que se resolvió el problema) y se reintenta desde el botón: la tarjeta pasa a `emitida` con CAE real, sin recargar la página, y el botón de descarga aparece solo.
- Pedido nuevo con factura en una org ya configurada: emitida directamente, descarga real desde el admin verificada como PDF válido.

## Dependencias

- **La bloquean**: Fase 2 — ya resuelta, Fase 3 — ya resuelta.
- **Bloquea**: nada directamente.
