import { z } from "zod";

export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug: solo minúsculas, números y guiones"),
  active: z.boolean(),
  createdAt: z.coerce.date(),
});

export const createOrganizationSchema = organizationSchema.pick({
  name: true,
  slug: true,
});

export type Organization = z.infer<typeof organizationSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
