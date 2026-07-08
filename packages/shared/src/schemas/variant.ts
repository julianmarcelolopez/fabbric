import { z } from "zod";

const stock = z.number().int().min(0);
const priceCents = z.number().int().min(0);

export const productVariantSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  orgId: z.string().uuid(),
  sku: z.string().nullable(),
  talle: z.string().min(1),
  color: z.string().min(1),
  stockOnline: stock,
  stockLocal: stock,
  priceOverride: priceCents.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createVariantSchema = z.object({
  talle: z.string().min(1),
  color: z.string().min(1),
  sku: z.string().nullable().optional(),
  stockOnline: stock.default(0),
  stockLocal: stock.default(0),
  priceOverride: priceCents.nullable().optional(),
});

// Desde T4 el stock NO se edita por PATCH: la única vía es registrar un
// movimiento (POST /admin/variants/:id/stock-movements). El stock inicial
// del alta (createVariantSchema) se mantiene como estado inicial.
export const updateVariantSchema = z
  .object({
    talle: z.string().min(1),
    color: z.string().min(1),
    sku: z.string().nullable(),
    priceOverride: priceCents.nullable(),
  })
  .partial();

export type ProductVariant = z.infer<typeof productVariantSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
