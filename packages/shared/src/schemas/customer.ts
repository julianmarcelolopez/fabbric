import { z } from "zod";

export const customerSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  // T34 — nullable: un cliente de alta puerta a puerta (sin login de
  // Google) no tiene ninguno de los dos. Ver customers en backend/src/db/schema.ts.
  googleSub: z.string().uuid().nullable(),
  email: z.string().email().nullable(),
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

// T34 — alta manual desde el admin/PWA (venta puerta a puerta): sin login
// de Google, así que sin googleSub ni email — solo nombre y, opcionalmente,
// teléfono. No reemplaza `resolveCustomer` (auth.ts), es un segundo camino
// de alta para clientes que nunca usaron la tienda online.
export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(1).max(30).optional(),
});

export type Customer = z.infer<typeof customerSchema>;
export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
