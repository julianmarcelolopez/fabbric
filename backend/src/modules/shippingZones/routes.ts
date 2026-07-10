import { createShippingZoneSchema, updateShippingZoneSchema } from "@fabbric/shared";
import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../../db/client.js";
import { shippingZones } from "../../db/schema.js";
import { AppError } from "../../lib/errors.js";
import { requireOrgId } from "../../lib/tenant.js";

const idParam = z.object({ id: z.string().uuid() });
const tag = { tags: ["envíos"], security: [{ bearerAuth: [] }] };

export async function shippingZonesRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { preHandler: fastify.requireAdminAuth };

  app.get(
    "/admin/shipping-zones",
    { ...auth, schema: { ...tag, summary: "Listar zonas de envío de la organización" } },
    async (request) => {
      const orgId = requireOrgId(request);
      return db
        .select()
        .from(shippingZones)
        .where(eq(shippingZones.orgId, orgId))
        .orderBy(asc(shippingZones.name));
    }
  );

  app.post(
    "/admin/shipping-zones",
    { ...auth, schema: { ...tag, summary: "Crear zona de envío", body: createShippingZoneSchema } },
    async (request, reply) => {
      const orgId = requireOrgId(request);
      const [row] = await db
        .insert(shippingZones)
        .values({ ...request.body, orgId })
        .returning();
      reply.status(201);
      return row;
    }
  );

  app.patch(
    "/admin/shipping-zones/:id",
    {
      ...auth,
      schema: { ...tag, summary: "Editar zona de envío", params: idParam, body: updateShippingZoneSchema },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const input = request.body;
      if (Object.keys(input).length === 0) {
        throw new AppError(400, "validation", "Nada para actualizar");
      }
      const [row] = await db
        .update(shippingZones)
        .set(input)
        .where(and(eq(shippingZones.id, id), eq(shippingZones.orgId, orgId)))
        .returning();
      if (!row) throw new AppError(404, "not_found", "Zona no encontrada");
      return row;
    }
  );

  app.delete(
    "/admin/shipping-zones/:id",
    {
      ...auth,
      schema: {
        ...tag,
        summary: "Borrar zona (las órdenes existentes conservan su snapshot)",
        params: idParam,
      },
    },
    async (request) => {
      const orgId = requireOrgId(request);
      const { id } = request.params;
      const [row] = await db
        .delete(shippingZones)
        .where(and(eq(shippingZones.id, id), eq(shippingZones.orgId, orgId)))
        .returning();
      if (!row) throw new AppError(404, "not_found", "Zona no encontrada");
      return { ok: true };
    }
  );
}
