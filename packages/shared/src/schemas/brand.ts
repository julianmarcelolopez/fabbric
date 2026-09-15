import { z } from "zod";
import { slugSchema } from "./category.js";

export const brandSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string().min(1),
  slug: slugSchema,
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createBrandSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
});

export const updateBrandSchema = z
  .object({
    name: z.string().min(1),
    slug: slugSchema,
    active: z.boolean(),
  })
  .partial();

export type Brand = z.infer<typeof brandSchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
