import { z } from "zod";

export const adminRoleSchema = z.enum(["super_admin", "owner", "staff"]);

export const adminUserSchema = z.object({
  // id = auth.users.id de Supabase
  id: z.string().uuid(),
  // null => super_admin (sin organización)
  orgId: z.string().uuid().nullable(),
  email: z.string().email(),
  role: adminRoleSchema,
  createdAt: z.coerce.date(),
});

// Alta de admin de un tenant (el super_admin se crea solo por seed)
export const createAdminUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["owner", "staff"]),
});

export type AdminRole = z.infer<typeof adminRoleSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
