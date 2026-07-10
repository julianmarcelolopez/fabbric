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
