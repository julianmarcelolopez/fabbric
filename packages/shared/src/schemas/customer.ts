import { z } from "zod";

export const customerSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  googleSub: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// El comprador solo edita su perfil de contacto (identidad viene de Google)
export const updateCustomerProfileSchema = z
  .object({
    name: z.string().min(1),
    phone: z.string().max(50).nullable(),
    address: z.string().max(500).nullable(),
  })
  .partial();

export type Customer = z.infer<typeof customerSchema>;
export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;
