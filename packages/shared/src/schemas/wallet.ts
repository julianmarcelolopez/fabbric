import { z } from "zod";

const cents = z.number().int().min(0);

export const walletSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string().min(1),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  initialBalance: cents,
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createWalletSchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().min(1).max(40).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color hex, ej #fcc424")
    .optional(),
  // Fijo al crear: los ajustes posteriores son movimientos (saldo auditable)
  initialBalance: cents.default(0),
});

// Sin initialBalance: no se edita nunca. Sin DELETE de carteras: solo active on/off.
export const updateWalletSchema = z
  .object({
    name: z.string().min(1).max(60),
    icon: z.string().min(1).max(40).nullable(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Color hex, ej #fcc424")
      .nullable(),
    active: z.boolean(),
  })
  .partial();

export type Wallet = z.infer<typeof walletSchema>;
export type CreateWalletInput = z.infer<typeof createWalletSchema>;
export type UpdateWalletInput = z.infer<typeof updateWalletSchema>;
