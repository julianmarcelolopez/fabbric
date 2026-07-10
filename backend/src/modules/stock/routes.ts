import {
  createStockMovementSchema,
  updateLowStockThresholdSchema,
} from "@fabbric/shared";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { catalogConfigs, products, productVariants, stockMovements } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { requireOrgId } from "../../lib/tenant.js";
import { ensureConfig } from "../catalogConfig/service.js";

const idParam = z.object({ id: z.string().uuid() });
const tag = { tags: ["stock"], security: [{ bearerAuth: [] }] };

async function stockOverview(orgId: string) {
  const config = await ensureConfig(orgId);
  const rows = await db
    .select({
      variantId: productVariants.id,
      productId: products.id,
      productName: products.name,
      talle: productVariants.talle,
      color: productVariants.color,
      sku: productVariants.sku,
      stockOnline: productVariants.stockOnline,
      stockLocal: productVariants.stockLocal,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.orgId, orgId))
    .orderBy(asc(products.name), asc(productVariants.talle), asc(productVariants.color));

  return {
    lowStockThreshold: config.lowStockThreshold,
    items: rows.map((r) => ({
      ...r,
      total: r.stockOnline + r.stockLocal,
      critical: r.stockOnline + r.stockLocal <= config.lowStockThreshold,
    })),
  };
}

export async function stockRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.post(
    "/admin/variants/:id/stock-movements",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Registrar movimiento de stock (entrada/venta/ajuste) — única vía de cambio",
        params: idParam,
        body: createStockMovementSchema,
      },
    },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const { id: variantId } = request.params;
      const { channel, type, delta, note } = request.body;

      const [variant] = await db
        .select()
        .from(productVariants)
        .where(and(eq(productVariants.id, variantId), eq(productVariants.orgId, orgId)));
      if (!variant) throw new AppError(404, "not_found", "Variante no encontrada");

      const column = channel === "online" ? productVariants.stockOnline : productVariants.stockLocal;

      const result = await db.transaction(async (tx) => {
        // Update guardado en SQL: solo aplica si el resultado queda >= 0 (sin carreras)
        const updated = await tx
          .update(productVariants)
          .set(
            channel === "online"
              ? { stockOnline: sql`${productVariants.stockOnline} + ${delta}` }
              : { stockLocal: sql`${productVariants.stockLocal} + ${delta}` }
          )
          .where(
            and(
              eq(productVariants.id, variantId),
              eq(productVariants.orgId, orgId),
              sql`${column} + ${delta} >= 0`
            )
          )
          .returning();
        if (updated.length === 0) return null; // stock insuficiente → rollback implícito
        const [movement] = await tx
          .insert(stockMovements)
          .values({ orgId, variantId, channel, type, delta, note: note ?? null })
          .returning();
        return { movement, variant: updated[0] };
      });

      if (!result) {
        throw new AppError(
          400,
          "insufficient_stock",
          `Stock ${channel} insuficiente: la operación dejaría el stock en negativo`
        );
      }
      reply.status(201);
      return result;
    }
  );

  app.get(
    "/admin/variants/:id/stock-movements",
    {
      ...auth,
      schema: { ...tag, summary: "Historial de movimientos de la variante (últimos 100)", params: idParam },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id: variantId } = request.params;
      const [variant] = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(and(eq(productVariants.id, variantId), eq(productVariants.orgId, orgId)));
      if (!variant) throw new AppError(404, "not_found", "Variante no encontrada");

      return db
        .select()
        .from(stockMovements)
        .where(eq(stockMovements.variantId, variantId))
        .orderBy(desc(stockMovements.createdAt))
        .limit(100);
    }
  );

  app.get(
    "/admin/stock",
    {
      ...auth,
      schema: { ...tag, summary: "Stock de todas las variantes con flag de crítico (según umbral)" },
    },
    async (request) => stockOverview(requireOrgId(request))
  );

  app.get(
    "/admin/stock/critical",
    { ...auth, schema: { ...tag, summary: "Solo variantes con stock crítico (online + local ≤ umbral)" } },
    async (request) => {
      const overview = await stockOverview(requireOrgId(request));
      return { ...overview, items: overview.items.filter((i) => i.critical) };
    }
  );

  app.get(
    "/admin/catalog-config",
    {
      ...auth,
      schema: { ...tag, summary: "Configuración de la tienda (se crea con defaults si no existe)" },
    },
    async (request) => ensureConfig(requireOrgId(request))
  );

  app.patch(
    "/admin/catalog-config/low-stock-threshold",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Actualizar el umbral de stock crítico",
        body: updateLowStockThresholdSchema,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      await ensureConfig(orgId);
      const [row] = await db
        .update(catalogConfigs)
        .set({ lowStockThreshold: request.body.lowStockThreshold })
        .where(eq(catalogConfigs.orgId, orgId))
        .returning();
      return row;
    }
  );
}
