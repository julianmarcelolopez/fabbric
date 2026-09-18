# T34 — Venta con anticipo / saldo pendiente (puerta a puerta)

## Contexto

Eliathi Modas vende también puerta a puerta: el vendedor entrega el producto y a veces solo cobra una parte, quedando un saldo a cobrar más adelante. Hoy eso no tiene ningún camino en el sistema — `POST /admin/orders/venta-local` (`backend/src/modules/orders/routes.ts:420`, el endpoint real detrás del botón "Confirmar venta" de la PWA, ver `docs/T23-App_ingreso_egreso_productos/overview.md` punto 6 de "Decisiones resueltas") asume pago completo e inmediato: crea el pedido ya `paid` con el `subtotal` entero como un solo movimiento financiero (`medioPagoSchema`, `packages/shared/src/schemas/order.ts:145`, solo admite `efectivo`/`transferencia`/`tarjeta`/`mercadopago`), y ni siquiera pide cliente.

Por eso, sin querer, las ventas puerta a puerta se estaban anotando a mano en Finanzas ("Nuevo movimiento", sin producto ni stock asociado) — un síntoma, no la causa. **T34 no toca Finanzas.** El módulo de Finanzas es a propósito una libreta de caja genérica (`frontend/src/features/admin/pages/FinanzasPage.tsx`), sin producto ni stock — agregarle un selector de producto crearía una segunda forma de vender y mover stock corriendo en paralelo al sistema de `orders`/`stockMovements`, exactamente lo que T23 evitó a propósito ("no se crea un sistema paralelo", `overview.md` línea 13). El arreglo real es que `venta-local` soporte el caso que hoy no soporta.

## Decisiones resueltas (charladas con el usuario)

1. **El saldo pendiente se cobra desde dos lugares**: la PWA (el vendedor vuelve a ver al cliente) y el panel admin (ej. el cliente transfiere) — mismo endpoint de backend para ambos clientes, no dos implementaciones distintas.
2. **El saldo tiene fecha límite única** (no cuotas programadas) — sirve para mostrar un recordatorio visual de vencimiento, sin necesidad de una tabla de cuotas aparte.
3. **El producto sale del stock igual, se cobre completo o no** — se entrega la prenda aunque el pago quede parcial. Esto es una desviación deliberada de la regla implícita de hoy ("cobrado antes de completado" — el pedido nace `paid` y ahí recién se descuenta), y hay que dejarla explícita: acá el descuento de stock no depende del estado de cobro.
4. **Cartera del anticipo**: por defecto, "Efectivo" (`LOCAL_SALE_WALLETS.efectivo`, `backend/src/modules/orders/routes.ts`) — asumiendo que el anticipo puerta a puerta casi siempre es en mano. Si en la práctica también puede ser transferencia, falta agregar un selector de cartera solo para este caso (no confirmado todavía, marcar como pregunta abierta si el diseño de la PWA lo necesita).

## Modelo de datos

**`orderStatus`** (`backend/src/db/schema.ts`, enum `pgEnum`) — un valor nuevo, `partial`, entre `pending` y `paid`:

```
["pending", "partial", "paid", "preparing", "shipped", "delivered", "cancelled"]
```

**`ORDER_TRANSITIONS`** (`packages/shared/src/schemas/order.ts:73`) — sumar la fila de `partial`, con el mismo criterio que ya usa `paid` (alcanzable solo por un endpoint específico, nunca por `PATCH /admin/orders/:id/status` genérico — ver `frontend/src/features/admin/pages/OrderAdminDetailPage.tsx:137`, que llama a ese PATCH para las transiciones manuales):

```ts
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cancelled"],
  partial: ["cancelled"],   // nuevo — a "paid" se llega solo vía /cobrar-saldo, no por PATCH
  paid: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
```

**`orders`** (`backend/src/db/schema.ts`) — una columna nueva:

| Columna | Tipo | Notas |
|---|---|---|
| `balanceDueDate` | `date`, nullable | Solo se completa cuando el pedido nace con `medioPago: "anticipo"`. `null` en cualquier otro pedido. |

**Lo que NO se agrega**: ni "monto pagado" ni "saldo pendiente" son columnas — se calculan sumando los `financialMovements` que ya tienen ese `orderId` (la tabla ya permite varias filas por pedido — no es una relación 1 a 1, no hace falta tocar su schema). Mismo criterio que ya usa el proyecto para derivar el tipo de pedido Catálogo/Personalizado/Mixto en vez de persistirlo (`ADMIN_ORDER_TYPE_LABELS`, `frontend/src/features/admin/types.ts:177`).

**`customers`** — sin cambios de schema. Pasa a ser **obligatorio** en `venta-local` cuando `medioPago === "anticipo"` (hoy no se pide, porque el flujo actual asume que se cobra todo ahí mismo).

**`medioPagoSchema`** (`packages/shared/src/schemas/order.ts:145`):

```ts
export const medioPagoSchema = z.enum(["efectivo", "transferencia", "tarjeta", "mercadopago", "anticipo"]);
```

**`ventaLocalSchema`** (`packages/shared/src/schemas/order.ts:161`) — campos condicionales:

```ts
export const ventaLocalSchema = z.object({
  items: z.array(ventaLocalItemSchema).min(1),
  medioPago: medioPagoSchema,
  montoPagado: z.number().int().min(1).optional(),  // centavos — obligatorio si medioPago === "anticipo"
  customerId: z.string().uuid().optional(),           // obligatorio si medioPago === "anticipo"
  balanceDueDate: z.string().optional(),               // fecha ISO — obligatorio si medioPago === "anticipo"
  factura: facturaAfipSchema.optional(),
}).refine(
  (data) => data.medioPago !== "anticipo" || (data.montoPagado && data.customerId && data.balanceDueDate),
  { message: "anticipo requiere montoPagado, customerId y balanceDueDate" }
);
```

**`ADMIN_ORDER_STATUS`** (`frontend/src/features/admin/types.ts:168-175`) — sumar la entrada de `partial`, reusando el mismo ámbar que ya usa `pending` (es un estado de atención, no de marca — mismo criterio que la spec de rediseño visual del admin):

```ts
partial: { label: "Saldo pendiente", color: "#b45309" },
```

## Backend — `POST /admin/orders/venta-local` (`backend/src/modules/orders/routes.ts:420`)

- **El descuento de stock no cambia.** Ya ocurre antes de crear el pedido, en el mismo loop atómico, sin importar el medio de pago — esto ya resuelve la decisión 3. No tocar esa parte.
- Al insertar la orden (hoy hardcodeado a `status: "paid"`):
  - `medioPago !== "anticipo"` → igual que hoy: `status: "paid"`, `balanceDueDate: null`.
  - `medioPago === "anticipo"` → `status: "partial"`, `customerId: body.customerId`, `balanceDueDate: body.balanceDueDate`.
- El movimiento financiero (hoy siempre por `subtotal` completo):
  - `medioPago !== "anticipo"` → igual que hoy, por el `subtotal` completo.
  - `medioPago === "anticipo"` → por `montoPagado` únicamente, en la cartera "Efectivo" (ver decisión 4).

## Backend — endpoint nuevo `POST /admin/orders/:id/cobrar-saldo`

- Body: `{ monto: number /* centavos */, medioPago: "efectivo" | "transferencia" | "tarjeta" | "mercadopago" }` (excluye `"anticipo"`).
- Valida: el pedido existe y es de la `orgId` del request (`requireOrgId`, mismo patrón que el resto de `orders/routes.ts`); `status === "partial"`.
- `pagadoHastaAhora = sum(financialMovements.amount WHERE orderId = :id)`.
- Si `pagadoHastaAhora + monto > order.total` → 400 `overpayment`.
- Inserta un `financialMovement` nuevo (`type: "income"`, `amount: monto`, `orderId: id`, cartera resuelta por `medioPago` igual que `venta-local`).
- Si `pagadoHastaAhora + monto >= order.total` → `orders.status = "paid"`.
- Devuelve el pedido actualizado + `saldoPendiente` calculado.
- **Mismo endpoint para PWA y admin** (decisión 1) — no se duplica lógica de cobro en dos lugares.

## Pantallas / flujo

**PWA** (`pwa/src/`):

1. **`CarritoScreen.tsx`** (el selector de medio de pago vive en las líneas 44-47, ver arriba) — sumar `"Anticipo"` a `PAYMENT_METHODS`. Al elegirlo: buscador de cliente (nombre + teléfono — mismo patrón que ya usa el alta manual del admin de escritorio, T7), input "Monto que paga ahora" (tope = total, muestra "Saldo pendiente: $X" en vivo), selector de fecha "Fecha límite para el saldo" (obligatorio). "Confirmar venta" (línea 274) deshabilitado hasta completar los 3 campos.
2. **Pantalla nueva `SaldosPendientesScreen.tsx`** — tercer destino en `BottomNav.tsx` (hoy solo Escanear/Carrito, 67 líneas). Lista de pedidos `partial` de la org: cliente, saldo, fecha límite (resaltada si venció). Tocar uno abre "Registrar cobro" (monto + medio de pago) → `cobrar-saldo`.
3. **`BottomNav.tsx`** — sumar el tercer ítem, con badge de cantidad si hay saldos vencidos (mismo patrón visual que el contador del carrito ya existente).

**Admin** (`frontend/src/features/admin/`):

1. **`OrdersPage.tsx`** (badge de estado en línea 113, filtro en línea 52) — el filtro por `status` ya existe como `<select>`, solo agrega la opción `partial`; el badge ya lee color desde `ADMIN_ORDER_STATUS`, así que con el cambio de datos de arriba no hace falta tocar el JSX de la tabla.
2. **`OrderAdminDetailPage.tsx`** (sección "Acciones" en línea 234, `order.allowedTransitions` en línea 285) — nueva sección "Saldo pendiente" (solo si `status === "partial"`): total, pagado, saldo, fecha límite (en rojo si venció) + formulario "Cobrar saldo" (monto + medio de pago) → mismo endpoint que la PWA.
3. **`DashboardPage.tsx`** / **`FinanzasPage.tsx`** — nuevo stat "Por cobrar" = suma de saldos pendientes de todos los pedidos `partial`.

## Recordatorio de fecha límite (decisión 2)

Sin infraestructura nueva (cron, push, email programado) para esta primera versión:

- Badge "Vence hoy" / "Vencido hace N días" en la lista de saldos pendientes, tanto en la PWA como en `OrdersPage.tsx` — cálculo simple client-side comparando `balanceDueDate` con la fecha de hoy.
- Un recordatorio proactivo (email al dueño) es fase aparte — Resend ya está integrado (T7), un cron diario sería viable pero es trabajo nuevo, no gratis con este cambio.

## Fuera de alcance de T34

- Facturación AFIP (T25) sobre pedidos `partial` — queda sin resolver si se puede facturar antes de terminar de cobrar o recién al pasar a `paid`. No se toca en esta tarea.
- Cuotas programadas / interés sobre el saldo — descartado explícitamente (decisión 2: fecha límite única, no cuotas).
- Recordatorio proactivo por email/push cuando vence el saldo — diferido, ver arriba.
- Cambios en Finanzas ("Nuevo movimiento") — a propósito no se toca, ver "Contexto".
- Selector de cartera para el anticipo (hoy fijo en "Efectivo") — pendiente de confirmar si hace falta.

## Criterios de aceptación

- Venta con anticipo desde la PWA: descuenta stock igual que cualquier venta, crea el pedido en `partial`, registra un único movimiento financiero por el anticipo, guarda cliente y fecha límite.
- "Cobrar saldo" funciona igual desde la PWA y desde el admin — ambos pegan al mismo endpoint y actualizan el mismo pedido.
- Al completarse el saldo (por uno o más cobros parciales), el pedido pasa a `paid` solo, sin acción manual extra.
- Intentar cobrar más del saldo pendiente devuelve 400 sin romper nada ni dejar movimientos a medias.
- `OrdersPage.tsx` muestra y filtra correctamente el estado "Saldo pendiente".
- El stat "Por cobrar" del Dashboard/Finanzas coincide con la suma real de saldos pendientes.
- `tsc --noEmit` limpio en los 3 workspaces.
