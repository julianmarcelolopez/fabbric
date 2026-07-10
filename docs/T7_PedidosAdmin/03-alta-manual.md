# Tarea 3 — Alta manual de pedidos (catálogo + bespoke)

**Estado:** ✅ Hecha (2026-07-10) — suite 11/11 PASS
**Depende de:** [02-endpoints-pedidos.md](02-endpoints-pedidos.md)

## Objetivo

El admin carga ventas que no pasaron por la tienda: telefónicas, presenciales, o de productos hechos a medida — el diferencial heredado de bordart.

## Pasos

- [x] `createManualOrderSchema` en shared: unión de ítem catálogo `{variantId, qty, channel}` y bespoke `{name, qty, unitPrice, unitCost?, referenceImageUrl?}`; customer/zona/nota opcionales
- [x] `POST /admin/orders` — pending con snapshots; **la venta manual acepta productos pausados/ocultos** (decisión: es del vendedor, no de la vidriera); stock del canal validado al crear, descontado al cobrar
- [x] `POST /admin/orders/reference-image` — multipart al bucket (`{orgId}/orders/ref-{uuid}.{ext}`) → URL
- [x] Clasificación derivada en los GET (tarea 2)

## Definition of Done

- [x] Suite 11/11: mixta con imagen → 201 `pending` tipo "mixto" (#3); snapshots verificados por SQL (bespoke con costo manual + imagen; catálogo con canal `local` y costo de DB); total sin envío cuando no hay zona; stock insuficiente/customer inexistente/variante inexistente → 400; `mark-paid` descontó **solo** el stock local del ítem de catálogo (online intacto, bespoke sin efecto) con movimiento `venta` local
- [x] Rutas en `/docs`; `tsc --noEmit` limpio; datos de prueba limpiados (incluida la imagen de Storage)
