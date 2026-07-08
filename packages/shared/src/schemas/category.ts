import { z } from "zod";

export const slugSchema = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug: solo minúsculas, números y guiones");

export const categorySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string().min(1),
  slug: slugSchema,
  sortOrder: z.number().int(),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
});

export const updateCategorySchema = z
  .object({
    name: z.string().min(1),
    slug: slugSchema,
    sortOrder: z.number().int(),
    active: z.boolean(),
  })
  .partial();

export type Category = z.infer<typeof categorySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
