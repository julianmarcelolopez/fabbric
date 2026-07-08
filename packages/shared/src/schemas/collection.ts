import { z } from "zod";
import { slugSchema } from "./category.js";

export const collectionSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string().min(1),
  slug: slugSchema,
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createCollectionSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
});

export const updateCollectionSchema = z
  .object({
    name: z.string().min(1),
    slug: slugSchema,
    active: z.boolean(),
  })
  .partial();

export type Collection = z.infer<typeof collectionSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
