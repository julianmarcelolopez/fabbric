import { z } from "zod";

export const productStatusSchema = z.enum(["active", "paused", "out_of_stock"]);

// Precios en centavos (enteros ≥ 0) — el frontend formatea a pesos
const priceCents = z.number().int().min(0);

// Marca: texto libre sugerido (no taxonomía propia), misma cota que financialMovement.category
const brandText = z.string().min(1).max(60);

export const productSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  price: priceCents,
  // Costo interno: solo visible en el admin, nunca en endpoints públicos
  costPrice: priceCents.nullable(),
  // Precio anterior, para mostrar tachado — a diferencia de costPrice, SÍ es público
  compareAtPrice: priceCents.nullable(),
  brand: brandText.nullable(),
  status: productStatusSchema,
  visibleInCatalog: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().default(""),
  price: priceCents,
  costPrice: priceCents.nullable().optional(),
  compareAtPrice: priceCents.nullable().optional(),
  brand: brandText.nullable().optional(),
  status: productStatusSchema.default("active"),
  visibleInCatalog: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateProductSchema = z
  .object({
    categoryId: z.string().uuid(),
    name: z.string().min(1),
    description: z.string(),
    price: priceCents,
    costPrice: priceCents.nullable(),
    compareAtPrice: priceCents.nullable(),
    brand: brandText.nullable(),
    status: productStatusSchema,
    visibleInCatalog: z.boolean(),
    sortOrder: z.number().int(),
  })
  .partial();

export const setProductCollectionsSchema = z.object({
  collectionIds: z.array(z.string().uuid()),
});

export type ProductStatus = z.infer<typeof productStatusSchema>;
export type Product = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type SetProductCollectionsInput = z.infer<typeof setProductCollectionsSchema>;
