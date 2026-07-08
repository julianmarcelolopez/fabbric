import { z } from "zod";

export const stockChannelSchema = z.enum(["online", "local"]);
export const stockMovementTypeSchema = z.enum(["entrada", "venta", "ajuste", "sync"]);

export const stockMovementSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  variantId: z.string().uuid(),
  channel: stockChannelSchema,
  type: stockMovementTypeSchema,
  delta: z.number().int(),
  note: z.string().nullable(),
  createdAt: z.coerce.date(),
});

// El admin solo registra entrada/venta/ajuste — "sync" está reservado para el
// webhook de Mercado Pago (T6) y no se acepta por la API admin.
export const createStockMovementSchema = z
  .object({
    channel: stockChannelSchema,
    type: z.enum(["entrada", "venta", "ajuste"]),
    delta: z
      .number()
      .int()
      .refine((d) => d !== 0, "delta no puede ser 0"),
    note: z.string().max(500).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    // Convención de signos por tipo
    if (val.type === "entrada" && val.delta <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delta"],
        message: "entrada requiere delta positivo",
      });
    }
    if (val.type === "venta" && val.delta >= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["delta"],
        message: "venta requiere delta negativo",
      });
    }
  });

export type StockChannel = z.infer<typeof stockChannelSchema>;
export type StockMovementType = z.infer<typeof stockMovementTypeSchema>;
export type StockMovement = z.infer<typeof stockMovementSchema>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
