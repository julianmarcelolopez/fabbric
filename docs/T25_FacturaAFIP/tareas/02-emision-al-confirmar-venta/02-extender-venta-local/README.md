# Tarea 2 — Extender `venta-local`: captura de datos + emisión post-transacción

**Estado:** ✅ Hecha (2026-09-03) — verificado con `t25-02-venta-local-con-factura.mjs` (13/13 PASS, camino de falla) y `t25-02b-venta-local-factura-emitida.mjs` (10/10 PASS, camino feliz con CAE real)

**Depende de:** Tarea 1 (migración `invoices`), Fase 1 (módulo `afip/`)

## Objetivo

Que el vendedor pueda pedir factura al confirmar una venta, sin que la robustez ya existente de `venta-local` (todo o nada sobre stock/pedido/cartera) se vea afectada por un problema de AFIP.

## Pasos

- [x] `ventaLocalSchema` (`packages/shared/src/schemas/order.ts`) extendido con bloque opcional `factura: { nombre, email, dni }` (`facturaAfipSchema`). También se agregó `invoiceStatusSchema`/`InvoiceStatus` — mismo shape que usan la respuesta de `venta-local` y (Tarea 3) la de `retry`.
- [x] Dentro de la transacción existente de `POST /admin/orders/venta-local`: si viene `factura`, inserta la fila en `invoices` (`estado` nace `pendiente` por default de la columna) — parte de la misma transacción, se revierte junto con todo lo demás si hay colisión de `orderNumber`.
- [x] **Después** de que la transacción commitea: si se creó la fila, se llama a `intentarEmision(orgId, invoiceId)` — función nueva y **compartida** en `backend/src/modules/invoices/service.ts` (pensada desde acá para que la Tarea 3 la reuse sin duplicar código). Usa `new Date()` en el momento del intento (no la fecha del pedido) para que un reintento días después mande a AFIP una fecha válida.
- [x] La respuesta de `venta-local` suma `factura: null | { id, estado, numero, cae, caeVencimiento, mensajeError }`.

## Cómo se implementó

- `backend/src/modules/invoices/service.ts`: `intentarEmision` — busca la factura por `id`+`orgId`, llama a `solicitarCae` (Fase 1), y hace `UPDATE` a `emitida` o `error` según el resultado. Nunca toca `orders`.
- `backend/src/modules/orders/routes.ts`: el `attempt()` interno de `venta-local` ahora devuelve `{ order, invoiceId }` en vez de solo `order` — el insert de `invoices` vive adentro de la transacción, pero la llamada a `intentarEmision` vive afuera, después del loop de reintento por colisión de `orderNumber`.

## Definition of Done

- [x] Sin `factura` en el body: comportamiento idéntico a T23, sin fila nueva en `invoices` — verificado (`t25-02-...mjs`).
- [x] Con `factura` y AFIP respondiendo bien: pedido `paid` + factura `emitida` con CAE real — verificado contra homologación real (`t25-02b-...mjs`, CAE `86360849328179`), usando una org descartable con la config de Eliathi copiada (sin tocar la org real).
- [x] Con `factura` y AFIP fallando (org de prueba sin config AFIP — mismo efecto que un fallo real): pedido igual `paid`, stock igual descontado, movimiento financiero igual registrado — factura en `error`. Confirmado que no queda ninguna venta a medias.
- [x] La respuesta del endpoint refleja el estado real de la factura en el mismo momento en que se confirma la venta.
- [x] Constraint de unicidad de `orderId` en `invoices` verificada funcionalmente (no solo en la migración): un segundo insert para el mismo pedido falla.

## Nota de latencia (no bloqueante)

Medido aparte: una vez que existe el ticket WSAA del CUIT, cada pedido de CAE tarda 2-4 segundos — aceptable para un flujo síncrono donde el vendedor espera la confirmación. El costo alto (~2 minutos) es único, la primera vez que se usa un CUIT nuevo contra AFIP — relevante para el día que se active el CUIT real de Edgar en producción, no para el uso normal.

## Dependencias

- **La bloquean**: Tarea 1 (`invoices`), Fase 1 (módulo `afip/`).
- **Bloquea**: Tarea 3 (`03-endpoint-retry`), Fase 3 (PDF/email necesitan una factura `emitida`), Fase 4/5 (PWA).
