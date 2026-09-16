import { z } from "zod";

export const productStatusSchema = z.enum(["active", "paused", "out_of_stock"]);

// Precios en centavos (enteros ≥ 0) — el frontend formatea a pesos
const priceCents = z.number().int().min(0);

// T29: marca deja de ser texto libre — pasa a ser un catálogo propio
// (ver @fabbric/shared brandSchema). Los formularios (admin/PWA) permiten
// elegir una marca existente (brandId) o crear una al vuelo (newBrandName,
// misma cota que tenía el texto libre viejo) — el backend resuelve
// newBrandName a un brandId antes de guardar el producto.
const newBrandName = z.string().min(1).max(60);

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
  brandId: z.string().uuid().nullable(),
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
  brandId: z.string().uuid().nullable().optional(),
  newBrandName: newBrandName.optional(),
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
    brandId: z.string().uuid().nullable(),
    newBrandName: newBrandName,
    status: productStatusSchema,
    visibleInCatalog: z.boolean(),
    sortOrder: z.number().int(),
  })
  .partial();

export const setProductCollectionsSchema = z.object({
  collectionIds: z.array(z.string().uuid()),
});

// Alta rápida por escaneo (T23): producto + variante en una sola operación
// atómica. qty opcional (default 1) fija el stockLocal inicial — cubre tanto
// "la prenda física que tenés en la mano" como una entrada de varias unidades
// idénticas nuevas de una sola vez. Sin descripción: el formulario móvil no
// la pide, queda vacía como en createProductSchema.
export const altaRapidaSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  brandId: z.string().uuid().nullable().optional(),
  newBrandName: newBrandName.optional(),
  price: priceCents,
  talle: z.string().min(1),
  color: z.string().min(1),
  barcode: z.string().min(1),
  qty: z.number().int().min(1).optional(),
});

export type ProductStatus = z.infer<typeof productStatusSchema>;
export type Product = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type SetProductCollectionsInput = z.infer<typeof setProductCollectionsSchema>;
export type AltaRapidaInput = z.infer<typeof altaRapidaSchema>;
