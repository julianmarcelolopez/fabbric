import { z } from "zod";

export const homeSectionRefTypeSchema = z.enum(["category", "collection"]);

export const homeSectionSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  refType: homeSectionRefTypeSchema,
  refId: z.string().uuid(),
  sortOrder: z.number().int(),
  visible: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createHomeSectionSchema = z.object({
  refType: homeSectionRefTypeSchema,
  refId: z.string().uuid(),
});

// Lo único editable de una sección es su visibilidad (el orden va por /order)
export const updateHomeSectionSchema = z.object({
  visible: z.boolean(),
});

export const reorderHomeSectionsSchema = z.object({
  sectionIds: z.array(z.string().uuid()).min(1),
});

export type HomeSectionRefType = z.infer<typeof homeSectionRefTypeSchema>;
export type HomeSection = z.infer<typeof homeSectionSchema>;
export type CreateHomeSectionInput = z.infer<typeof createHomeSectionSchema>;
export type UpdateHomeSectionInput = z.infer<typeof updateHomeSectionSchema>;
export type ReorderHomeSectionsInput = z.infer<typeof reorderHomeSectionsSchema>;
