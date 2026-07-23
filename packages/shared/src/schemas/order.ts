import { z } from "zod";

export const orderStatusSchema = z.enum([
  "pending",
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
