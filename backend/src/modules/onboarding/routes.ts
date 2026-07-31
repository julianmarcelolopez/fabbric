import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db } from "../../db/client.js";
import {
  catalogConfigs,
  categories,
  products,
  productVariants,
  shippingZones,
} from "../../db/schema.js";
import { requireOrgId } from "../../lib/tenant.js";

const tag = { tags: ["onboarding"], security: [{ bearerAuth: [] }] };

export async function onboardingRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.get(
    "/admin/onboarding-status",
    {
      ...auth,
      schema: {
        ...tag,
        summary:
          "Estado de los pasos de arranque de la org (T19/03) — para el checklist del Dashboard",
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);

      const [[cat], [prodWithVariant], [zone], [config]] = await Promise.all([
        db.select({ id: categories.id }).from(categories).where(eq(categories.orgId, orgId)).limit(1),
        db
          .select({ id: products.id })
          .from(products)
          .innerJoin(productVariants, eq(productVariants.productId, products.id))
          .where(eq(products.orgId, orgId))
          .limit(1),
        db
          .select({ id: shippingZones.id })
          .from(shippingZones)
          .where(and(eq(shippingZones.orgId, orgId), eq(shippingZones.active, true)))
          .limit(1),
        // No usa ensureConfig a propósito: este endpoint es de solo lectura,
        // no queremos que consultar el estado de arranque cree una fila.
        db
          .select({ mpAccessToken: catalogConfigs.mpAccessToken })
          .from(catalogConfigs)
          .where(eq(catalogConfigs.orgId, orgId))
          .limit(1),
      ]);

      return {
        hasCategory: !!cat,
        hasProductWithVariant: !!prodWithVariant,
        hasActiveShippingZone: !!zone,
        hasMercadoPago: !!config?.mpAccessToken,
      };
    }
  );
}
