import { z } from "zod";

// T34 — "partial": venta con anticipo (puerta a puerta), nace directo así
// en vez de "paid" cuando el cobro no fue completo. Igual que "paid", no se
// alcanza por PATCH genérico (ver ORDER_TRANSITIONS más abajo) — solo por
// /venta-local (nace así) o /cobrar-saldo (llega a "paid" al completarse).
export const orderStatusSchema = z.enum([
  "pending",
  "partial",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
]);

export const orderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  // null = ítem personalizado/bespoke (T7) o producto borrado (queda el snapshot)
  productId: z.string().uuid().nullable(),
  variantId: z.string().uuid().nullable(),
  name: z.string(),
  talle: z.string().nullable(),
  color: z.string().nullable(),
  qty: z.number().int().min(1),
  unitPrice: z.number().int(),
  unitCostSnapshot: z.number().int().nullable(),
  total: z.number().int(),
  referenceImageUrl: z.string().url().nullable(),
});

export const orderSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  orderNumber: z.number().int(),
  status: orderStatusSchema,
  shippingZoneId: z.string().uuid().nullable(),
  shippingZoneName: z.string().nullable(),
  shippingCost: z.number().int(),
  subtotal: z.number().int(),
  total: z.number().int(),
  currency: z.string(),
  trackingNumber: z.string().nullable(),
  mpPreferenceId: z.string().nullable(),
  mpPaymentId: z.string().nullable(),
  note: z.string().nullable(),
  // T34 — solo no-null cuando el pedido nace con medioPago "anticipo".
  balanceDueDate: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// El checkout NO recibe precios del cliente: solo variantes y cantidades.
// Los precios se releen de la DB al crear la orden.
export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        qty: z.number().int().min(1).max(99),
      })
    )
    .min(1),
  shippingZoneId: z.string().uuid(),
  note: z.string().max(500).nullable().optional(),
});

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ── Máquina de estados (T7) ──────────────────────────────────────────────────
// Fuente de verdad compartida: el backend valida, el frontend solo muestra
// botones válidos. `paid` NO se alcanza por PATCH: llega por el webhook de MP
// o por el endpoint de cobro manual (mark-paid).

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cancelled"],
  // T34 — a "paid" se llega solo vía /cobrar-saldo, no por PATCH (mismo
  // criterio que "paid" nunca aparece como destino en ningún otro estado).
  partial: ["cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  trackingNumber: z.string().max(100).nullable().optional(),
});

// Cobro manual (T9): "cobrado antes de completado" — el cobro siempre entra a
// una cartera, y eso crea el movimiento financiero vinculado al pedido.
export const markPaidSchema = z.object({
  walletId: z.string().uuid(),
});
export type MarkPaidInput = z.infer<typeof markPaidSchema>;

/** Clasificación derivada (patrón bordart) — nunca se persiste */
export const orderTypeSchema = z.enum(["catalogo", "personalizado", "mixto"]);
export type OrderType = z.infer<typeof orderTypeSchema>;

export function deriveOrderType(items: { productId: string | null }[]): OrderType {
  const withProduct = items.filter((i) => i.productId !== null).length;
  if (withProduct === items.length) return "catalogo";
  if (withProduct === 0) return "personalizado";
  return "mixto";
}

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ── Alta manual de pedidos (T7): venta telefónica/presencial/bespoke ─────────

/** Ítem de catálogo: precio/costo salen de la DB; el canal define de qué stock sale al cobrar */
export const manualCatalogItemSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1).max(99),
  channel: z.enum(["online", "local"]),
});

/** Ítem personalizado/bespoke: sin producto de catálogo, precio y costo manuales */
export const manualBespokeItemSchema = z.object({
  name: z.string().min(1).max(200),
  qty: z.number().int().min(1).max(99),
  unitPrice: z.number().int().min(0),
  unitCost: z.number().int().min(0).nullable().optional(),
  referenceImageUrl: z.string().url().nullable().optional(),
});

export const createManualOrderSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  shippingZoneId: z.string().uuid().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  items: z.array(z.union([manualCatalogItemSchema, manualBespokeItemSchema])).min(1),
});

export type ManualCatalogItem = z.infer<typeof manualCatalogItemSchema>;
export type ManualBespokeItem = z.infer<typeof manualBespokeItemSchema>;
export type CreateManualOrderInput = z.infer<typeof createManualOrderSchema>;

// ── Venta presencial (T23): la PWA de escaneo confirma la venta como una
// sola operación — nace directamente `paid`, no pasa por `pending`/mark-paid.
// Solo ítems de catálogo (channel local implícito) — sin bespoke, sin cliente,
// sin zona de envío: es una venta de mostrador, no un pedido a domicilio.

export const medioPagoSchema = z.enum(["efectivo", "transferencia", "tarjeta", "mercadopago"]);

// T34 — "anticipo" queda AFUERA de medioPagoSchema/MedioPago a propósito:
// ese tipo se usa en dos Record<MedioPago, ...> exhaustivos en otros
// lugares (LOCAL_SALE_WALLETS en el backend, MEDIO_LABELS en la PWA) donde
// "anticipo" no tiene sentido como entrada (no es una cartera real, es un
// modificador del flujo de venta). Union angosta, solo para venta-local.
export const ventaLocalMedioPagoSchema = medioPagoSchema.or(z.literal("anticipo"));
export type VentaLocalMedioPago = z.infer<typeof ventaLocalMedioPagoSchema>;

export const ventaLocalItemSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1).max(99),
});

// T25 — facturación AFIP opcional de la venta: si el vendedor activa el
// toggle en la PWA, se manda este bloque; si no, se omite del todo (no un
// objeto vacío) y la venta se comporta exactamente igual que en T23.
export const facturaAfipSchema = z.object({
  nombre: z.string().min(1).max(200),
  email: z.string().email(),
  dni: z.string().min(1).max(20),
});

// T34 — venta con anticipo: montoPagado/customerId/balanceDueDate solo se
// mandan (y son obligatorios) cuando medioPago === "anticipo"; en cualquier
// otro caso la venta se comporta exactamente igual que en T23.
export const ventaLocalSchema = z
  .object({
    items: z.array(ventaLocalItemSchema).min(1),
    medioPago: ventaLocalMedioPagoSchema,
    montoPagado: z.number().int().min(1).optional(), // centavos
    customerId: z.string().uuid().optional(),
    balanceDueDate: z.string().optional(), // fecha ISO
    factura: facturaAfipSchema.optional(),
  })
  .refine((data) => data.medioPago !== "anticipo" || (data.montoPagado && data.customerId && data.balanceDueDate), {
    message: "anticipo requiere montoPagado, customerId y balanceDueDate",
  });

// T34 — registrar un cobro sobre el saldo pendiente de un pedido "partial".
// Mismo endpoint para PWA y admin (decisión de negocio, ver
// docs/T34_VentaConAnticipo/analisis.md) — medioPago reusa medioPagoSchema
// tal cual, "anticipo" no es una opción acá (no tiene sentido cobrar un
// anticipo sobre un saldo que ya es la segunda parte de la venta).
export const cobrarSaldoSchema = z.object({
  monto: z.number().int().min(1), // centavos
  medioPago: medioPagoSchema,
});
export type CobrarSaldoInput = z.infer<typeof cobrarSaldoSchema>;

export const invoiceEstadoSchema = z.enum(["pendiente", "emitida", "error"]);

// T25 — estado de la factura devuelto por POST /admin/orders/venta-local y
// por POST /admin/invoices/:id/retry — mismo shape en los dos endpoints.
export const invoiceStatusSchema = z.object({
  id: z.string().uuid(),
  estado: invoiceEstadoSchema,
  numero: z.number().int().nullable(),
  cae: z.string().nullable(),
  caeVencimiento: z.string().nullable(),
  mensajeError: z.string().nullable(),
});

export type MedioPago = z.infer<typeof medioPagoSchema>;
export type VentaLocalItem = z.infer<typeof ventaLocalItemSchema>;
export type FacturaAfipInput = z.infer<typeof facturaAfipSchema>;
export type VentaLocalInput = z.infer<typeof ventaLocalSchema>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
