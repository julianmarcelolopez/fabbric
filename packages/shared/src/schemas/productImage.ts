import { z } from "zod";

// El upload va por multipart (no JSON) — acá solo la forma de la entidad y el reorder

export const productImageSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  orgId: z.string().uuid(),
  storagePath: z.string(),
  url: z.string().url(),
  sortOrder: z.number().int(),
  createdAt: z.coerce.date(),
});

export const reorderImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1),
});

export type ProductImage = z.infer<typeof productImageSchema>;
export type ReorderImagesInput = z.infer<typeof reorderImagesSchema>;
