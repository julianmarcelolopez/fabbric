import { z } from "zod";

const cents = z.number().int().min(0);

export const shippingZoneSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string().min(1),
  cost: cents,
  freeShippingFrom: cents.nullable(),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createShippingZoneSchema = z.object({
  name: z.string().min(1),
  cost: cents,
  freeShippingFrom: cents.nullable().optional(),
});

export const updateShippingZoneSchema = z
  .object({
    name: z.string().min(1),
    cost: cents,
    freeShippingFrom: cents.nullable(),
    active: z.boolean(),
  })
  .partial();

export type ShippingZone = z.infer<typeof shippingZoneSchema>;
export type CreateShippingZoneInput = z.infer<typeof createShippingZoneSchema>;
export type UpdateShippingZoneInput = z.infer<typeof updateShippingZoneSchema>;
