import { z } from "zod";

export const movementTypeSchema = z.enum(["income", "expense"]);
export type MovementType = z.infer<typeof movementTypeSchema>;

// Fecha CONTABLE (YYYY-MM-DD, sin hora): el reporte mensual agrupa por este
// campo. Default en el backend: hoy en America/Argentina/Buenos_Aires.
export const movementDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha YYYY-MM-DD");

export const financialMovementSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  walletId: z.string().uuid(),
  type: movementTypeSchema,
  // Siempre positivo: el signo lo da `type`
  amount: z.number().int().positive(),
  category: z.string().nullable(),
  description: z.string().nullable(),
  date: movementDateSchema,
  // Vinculado a un pedido (cobro) => imborrable
  orderId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
});

export const createFinancialMovementSchema = z.object({
  walletId: z.string().uuid(),
  type: movementTypeSchema,
  amount: z.number().int().positive(),
  category: z.string().min(1).max(60).optional(),
  description: z.string().min(1).max(300).optional(),
  date: movementDateSchema.optional(),
});

// Rubros sugeridos en la UI (datalist) — texto libre en la DB, no un enum.
// Heredados tal cual del módulo de finanzas de Bordart (validados en producción).
export const SUGGESTED_INCOME_CATEGORIES = [
  "Venta",
  "Anticipo",
  "Devolución",
  "Otro ingreso",
] as const;

export const SUGGESTED_EXPENSE_CATEGORIES = [
  "Tela / Material",
  "Insumos",
  "Mano de obra",
  "Publicidad",
  "Envíos",
  "Impuestos",
  "Alquiler",
  "Servicios",
  "Otro egreso",
] as const;

export type FinancialMovement = z.infer<typeof financialMovementSchema>;
export type CreateFinancialMovementInput = z.infer<typeof createFinancialMovementSchema>;
