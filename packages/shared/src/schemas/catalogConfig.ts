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
  bannerUrl: z.string().url().nullable(),
  whatsapp: z.string().nullable(),
  instagram: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  businessHours: z.string().nullable(),
  lowStockThreshold: z.number().int().min(0),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// T4 solo expone editar el umbral; el update completo de la config llega en T5
export const updateLowStockThresholdSchema = z.object({
  lowStockThreshold: z.number().int().min(0),
});

// Update completo de la identidad de la tienda (T5). El logo va por multipart aparte.
// bannerUrl (T14) tampoco entra acá por el mismo motivo: se setea solo vía su
// propio endpoint multipart, nunca como URL arbitraria por este PATCH.
export const updateCatalogConfigSchema = z
  .object({
    storeName: z.string().min(1),
    slug: slugSchema,
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "color en formato #rrggbb"),
    theme: z.string().min(1),
    businessDescription: z.string().max(2000).nullable(),
    // Perfil de tienda (T14) — para wa.me/<numero>; la limpieza de formato es del frontend
    whatsapp: z.string().min(6).max(20).nullable(),
    instagram: z.string().min(1).max(100).nullable(),
    email: z.string().email().nullable(),
    address: z.string().min(1).max(200).nullable(),
    businessHours: z.string().min(1).max(200).nullable(),
    active: z.boolean(),
  })
  .partial();

export type CatalogConfig = z.infer<typeof catalogConfigSchema>;
export type UpdateLowStockThresholdInput = z.infer<typeof updateLowStockThresholdSchema>;
export type UpdateCatalogConfigInput = z.infer<typeof updateCatalogConfigSchema>;
