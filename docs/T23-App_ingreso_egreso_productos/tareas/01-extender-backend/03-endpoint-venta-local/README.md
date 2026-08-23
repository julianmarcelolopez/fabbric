# Tarea 3 — Endpoint `POST /admin/orders/venta-local` + carteras genéricas

**Estado:** ✅ Hecha (2026-08-17) — suite `t23-03-venta-local.mjs` 25/25 PASS
**Depende de:** Fase 0 (no depende de las Tareas 1/2 — puede desarrollarse en paralelo, usa `variantId`, no `barcode`)

## Objetivo

Un solo endpoint que registre una venta presencial completa — pedido, descuento de stock, cobro y movimiento financiero — en una única transacción, pensado para que la PWA funcione como una pistola de punto de venta (un toque, sin pasos intermedios que puedan quedar a medias). Combina lo que hoy son dos flujos separados (alta manual de T7 + cobro con cartera de T9).

## Pasos

### 3.1 — Generalizar la cartera lazy (`backend/src/modules/finance/service.ts`)

- [x] Agregado `ensureWallet(tx, orgId, name, opts?: {icon?, color?})` genérico, mismo mecanismo que tenía `ensureMpWallet` (select → insert `onConflictDoNothing` → releer si hubo carrera).
- [x] `ensureMpWallet` reescrita como wrapper de `ensureWallet` con `MP_WALLET_NAME`, `icon: "mercadopago"`, `color: "#00b1ea"` — comportamiento del webhook de MP intacto (verificado: la venta local con `mercadopago` reusa la misma cartera única).
- [x] Mapeo `medioPago → cartera` (`LOCAL_SALE_WALLETS` en `orders/routes.ts`): `efectivo` → `"Efectivo"`, `transferencia` → `"Transferencia"`, `tarjeta` → `"Tarjeta"`, `mercadopago` → `MP_WALLET_NAME` (misma cartera del webhook online).

### 3.2 — Endpoint `POST /admin/orders/venta-local`

`backend/src/modules/orders/routes.ts`:

- [x] Body: `{ items: [{variantId, qty}], medioPago }` — `ventaLocalSchema` nuevo en `packages/shared/src/schemas/order.ts`.
- [x] Todo dentro de una sola `db.transaction`:
  - [x] Descuento de `stockLocal` por línea con el mismo guard atómico `WHERE stockLocal - qty >= 0` que usa `/stock-movements` (no un SELECT previo) — si cualquier línea no tiene stock suficiente, se **tira una excepción** (`InsufficientStockError`) dentro de la transacción, lo que fuerza el rollback de TODO el intento, incluidas las líneas anteriores del mismo loop que sí se habían descontado. (Nota de diseño: un simple `return` sentinel, como hace `mark-paid` para sus casos `not_found`/`not_pending`, **no** hubiera alcanzado acá — ahí el guard corre siempre antes de cualquier escritura; acá el guard corre línea por línea dentro de un loop que sí escribe, así que hace falta `throw` para garantizar el rollback si una línea posterior falla después de que una anterior ya escribió.)
  - [x] `orderNumber` secuencial por org, con el mismo retry sobre la unique que ya usa la creación de pedidos manuales.
  - [x] `order` insertado directamente en `status: "paid"`.
  - [x] `orderItems` con `channel: "local"` y snapshots (`name`, `talle`, `color`, `unitPrice`, `unitCostSnapshot`).
  - [x] `stockMovements` tipo `venta`/`local` por ítem.
  - [x] Cartera resuelta con `ensureWallet` según `medioPago`.
  - [x] `recordOrderCharge` para el movimiento financiero vinculado.
  - [x] Devuelve el pedido con su `total`.
- [x] Documentado en Swagger.

## Definition of Done

- [x] Venta con stock suficiente (2 líneas): 201, pedido `paid`, `orderItems` creados, `stockLocal` descontado exactamente en cada variante, movimiento financiero creado en la cartera correcta con el monto exacto — verificado por SQL.
- [x] Venta con stock insuficiente en una de dos líneas: 400 `insufficient_stock`, **nada** quedó escrito — ni la línea que sí tenía stock (verificado que su `stockLocal` no cambió), ni pedido, ni movimiento de stock, ni movimiento financiero, ni la cartera que se hubiera creado.
- [x] Repetir una venta con el mismo `medioPago` reusa la cartera existente (verificado: sigue habiendo una sola fila `Efectivo`), no la duplica.
- [x] Una venta con `medioPago: mercadopago` usa la misma cartera única `"Mercado Pago"` que ya usa el webhook online.
- [x] Aislamiento: `variantId` de otra organización → 400 `invalid_items`.
- [x] Sin token → 401.
- [x] Ruta en `/docs`; `tsc --noEmit` limpio (host y contenedor Docker).
- [x] Verificado con `backend/t23-03-venta-local.mjs` (25/25 PASS) contra el backend levantado con `docker compose up -d backend` — datos de prueba limpiados al final.

## Dependencias

- **La bloquean**: Fase 0 — ya resuelta. No depende de las Tareas 1/2 de esta misma fase.
- **Bloquea**: Fase 05 (`carrito-venta`) de la app — es el endpoint que confirma la venta.
