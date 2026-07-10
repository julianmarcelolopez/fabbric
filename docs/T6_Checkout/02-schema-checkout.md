# Tarea 2 — Schema: `customers`, `shipping_zones`, `orders`, `order_items`

**Estado:** ✅ Hecha (2026-07-09) — 11/11 PASS
**Depende de:** —

## Objetivo

Toda la estructura de datos del flujo de venta en una sola migración — incluyendo los campos bespoke que usa T7, para no migrar dos veces.

## Pasos

### Drizzle

- [ ] Enum `order_status`: `pending` | `paid` | `preparing` | `shipped` | `delivered` | `cancelled`
- [ ] `customers`: `id` (uuid pk = **auth.users.id NO** — id propio; el vínculo con auth es `googleSub`), `orgId` (FK), `googleSub`, `email`, `name`, `phone` (nullable), `address` (nullable, text), timestamps. `unique(orgId, googleSub)`.
- [ ] `shipping_zones`: `id`, `orgId` (FK), `name`, `cost` (int centavos), `freeShippingFrom` (int centavos, nullable), `active` (default true), timestamps.
- [ ] `orders`: `id`, `orgId` (FK), `customerId` (FK a customers, **nullable** — T7 permite pedidos manuales sin cliente), `orderNumber` (int, secuencial **por org** — ver nota), `status` (enum, default `pending`), `shippingZoneId` (FK nullable), `shippingZoneName` + `shippingCost` (snapshot), `subtotal`, `total` (int centavos), `currency` (default `ARS`), `trackingNumber` (nullable), `mpPreferenceId` (nullable), `mpPaymentId` (nullable), `note` (nullable), timestamps. Index por `(orgId, createdAt)`.
- [ ] `order_items`: `id`, `orderId` (FK cascade), `orgId`, `productId` (FK **nullable** — null = ítem bespoke T7), `variantId` (FK nullable, `onDelete: set null` — la orden sobrevive a la variante), snapshots: `name`, `talle` (nullable), `color` (nullable), `qty` (int > 0), `unitPrice` (centavos), `unitCostSnapshot` (centavos, nullable), `total`, `referenceImageUrl` (nullable — bespoke).
- [ ] **Nota `orderNumber`**: secuencial por org sin colisiones → `unique(orgId, orderNumber)` + asignación transaccional (`max+1` dentro de la transacción del checkout; la unique ataja carreras → retry).
- [ ] Migración `db:generate --name checkout` → revisar SQL → `db:migrate`

### Schemas Zod (`packages/shared`)

- [ ] `customer.ts` — entidad + `updateCustomerProfileSchema` (name, phone, address)
- [ ] `shippingZone.ts` — entidad + create/update (name, cost ≥ 0, freeShippingFrom nullable, active)
- [ ] `order.ts` — enum de status + entidad + `checkoutSchema` (items: [{ variantId, qty ≥ 1 }] min 1, shippingZoneId) — el checkout NO recibe precios del cliente
- [ ] Re-export en `index.ts`

## Definition of Done

- [x] Migración `0003_checkout.sql` versionada y aplicada (4 migraciones registradas); 4 tablas + enum `order_status` verificados
- [x] Constraints con inserts reales: `unique(orgId, googleSub)` y `unique(orgId, orderNumber)` → 23505; cascade de `order_items` al borrar orden; `set null` de `variantId` (el item queda con su snapshot); `set null` de `shippingZoneId` (la orden sobrevive con el nombre snapshoteado)
- [x] Schemas Zod: `customer.ts`, `shippingZone.ts`, `order.ts` (con `checkoutSchema` que NO acepta precios del cliente) — re-exportados
- [x] `tsc --noEmit` limpio en los tres workspaces
