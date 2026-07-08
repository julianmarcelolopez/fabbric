import { z } from "zod";
import { slugSchema } from "./category.js";

export const catalogConfigSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  // URL pública de la tienda (/store/<slug>) — único global
  slug: slugSchema,
  storeName: z.string().min(1),
  logoUrl: z.string().url().nullable(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  theme: z.string(),
  businessDescription: z.string().nullable(),
  lowStockThreshold: z.number().int().min(0),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// T4 solo expone editar el umbral; el update completo de la config llega en T5
export const updateLowStockThresholdSchema = z.object({
  lowStockThreshold: z.number().int().min(0),
});

export type CatalogConfig = z.infer<typeof catalogConfigSchema>;
export type UpdateLowStockThresholdInput = z.infer<typeof updateLowStockThresholdSchema>;
