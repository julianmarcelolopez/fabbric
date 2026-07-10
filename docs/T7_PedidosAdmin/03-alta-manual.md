# Tarea 3 — Alta manual de pedidos (catálogo + bespoke)

**Estado:** ⬜ Pendiente
**Depende de:** [02-endpoints-pedidos.md](02-endpoints-pedidos.md)

## Objetivo

El admin carga ventas que no pasaron por la tienda: telefónicas, presenciales, o de productos hechos a medida — el diferencial heredado de bordart.

## Pasos

- [ ] Schema Zod (`shared`): `createManualOrderSchema` — `customerId?` (nullable — venta sin cliente registrado), `note?`, `shippingZoneId?` (nullable — retiro en local), `items` (min 1) donde cada ítem es:
  - **catálogo**: `{ variantId, qty, channel: "online"|"local" }` (precio/costo salen de la DB; el canal define de dónde saldrá el stock al cobrar)
  - **bespoke**: `{ name, qty, unitPrice, unitCost?, referenceImageUrl? }` (sin variantId)
- [ ] `POST /admin/orders` — crea la orden `pending` con snapshots (mismo patrón del checkout); valida variantes de la org y stock disponible del canal para ítems catálogo
- [ ] `POST /admin/orders/reference-image` — upload multipart de la imagen de referencia bespoke (bucket, path `{orgId}/orders/{uuid}.{ext}`, patrón T2) → devuelve URL para usar en el alta
- [ ] La clasificación Catálogo/Personalizado/Mixto se deriva en los GET (tarea 2)

## Definition of Done

- [ ] Suite: orden manual mixta (1 ítem catálogo + 1 bespoke con imagen) → 201 con snapshots correctos; tipo derivado "mixto"; sin cliente → cliente null OK; stock del canal insuficiente → 400; `mark-paid` sobre ella descuenta solo el ítem de catálogo
- [ ] Aislamiento; rutas en `/docs`; `tsc --noEmit` limpio
